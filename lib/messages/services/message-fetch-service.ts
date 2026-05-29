import type {
  Message,
  Channel,
  Reaction,
  MessageFetchConfig,
  MessageFetchResult,
  MessageRetrievalOptions,
  ProgressPhase,
  SearchCriteria,
} from "../types.ts";
import {
  getNextSearchData,
  getNextSearchStatus,
  isMessageTypeAllowed,
  isGuildForum,
  isDm,
  isCriteriaActive,
  getThreadEntityName,
  getThreadsFromMessages,
} from "../utils.ts";
import { PaginationHelper } from "../pagination.ts";

export class MessageFetchService {
  private paginationHelper: PaginationHelper;

  constructor(private config: MessageFetchConfig) {
    this.paginationHelper = new PaginationHelper(config);
  }

  /**
   * Main entry point - fetches messages based on criteria
   */
  async fetchMessages(
    guildId: string | null,
    channelId: string | null,
    options: MessageRetrievalOptions = {},
  ): Promise<MessageFetchResult> {
    const { searchCriteria } = options;

    // Determine if we should use search or direct fetch
    if (searchCriteria && isCriteriaActive(searchCriteria)) {
      return this.fetchSearchMessages(channelId, guildId, searchCriteria, options);
    } else if (channelId) {
      return this.fetchChannelMessages(channelId);
    }

    return {
      messages: [],
      threads: [],
      searchCriteria,
    };
  }

  /**
   * Fetches messages using Discord search API
   */
  private async fetchSearchMessages(
    channelId: string | null,
    guildId: string | null,
    searchCriteria: SearchCriteria,
    options: MessageRetrievalOptions,
  ): Promise<MessageFetchResult> {
    const { excludeReactions, startOffset, endOffset } = options;
    const channel = this.config.channelProvider?.findChannel(channelId || "");

    let knownMessages: Message[] = [];
    let knownThreads: Channel[] = [];
    let offset = startOffset || 0;
    let isEndConditionMet = false;
    let totalMessages = 0;
    let criteria = { ...searchCriteria };

    while (!isEndConditionMet) {
      if (await this.shouldStop()) break;

      const { success, data } = await this.config.apiClient.fetchSearchMessageData(
        this.config.token,
        offset,
        channelId,
        guildId,
        criteria,
      );

      if (success && data) {
        const { total_results, messages = [], threads = [] } = data;
        const isResultsFound = !!total_results || messages.length > 0;

        if (!isResultsFound) break;

        totalMessages = total_results;

        // Collect unique threads
        threads.forEach((t) => {
          if (!knownThreads.some((k) => k.id === t.id)) {
            knownThreads.push(t);
          }
        });

        // Flatten and filter messages
        const flatMessages = messages.flat();
        const lastMessage = flatMessages[flatMessages.length - 1];

        // Calculate next search data
        const nextSearchData = getNextSearchData(
          lastMessage,
          offset,
          totalMessages,
          isEndConditionMet,
          criteria,
          endOffset,
        );

        offset = nextSearchData.offset;
        isEndConditionMet = nextSearchData.isEndConditionMet;
        criteria = nextSearchData.searchCriteria;

        // Add filtered messages
        knownMessages.push(
          ...flatMessages.filter((m) => isMessageTypeAllowed(m.type)),
        );

        // Update progress/status
        const status = getNextSearchStatus(
          knownThreads,
          knownMessages,
          totalMessages,
          channel,
        );
        this.config.onStatus?.(status);
        this.emitProgress("fetching_messages", knownMessages.length, totalMessages, status);
      } else {
        isEndConditionMet = true;
      }
    }

    // Resolve reactions if needed (for search messages)
    if (
      !excludeReactions &&
      this.config.settings.reactionsEnabled &&
      knownMessages.length > 0
    ) {
      knownMessages = await this.resolveMessageReactions(knownMessages);
    }

    return {
      messages: knownMessages,
      threads: knownThreads,
      offset,
      searchCriteria: criteria,
      totalMessages,
    };
  }

  /**
   * Fetches messages from a specific channel (non-search)
   */
  private async fetchChannelMessages(channelId: string): Promise<MessageFetchResult> {
    const channel = this.config.channelProvider?.findChannel(channelId);
    const trackedThreads: Channel[] = [];
    let messages: Message[] = [];

    if (!channel) {
      return { messages: [], threads: [] };
    }

    // Handle forum channels
    if (isGuildForum(channel)) {
      const searchResult = await this.fetchSearchMessages(
        channelId,
        channel.guild_id || null,
        {} as SearchCriteria,
        {},
      );
      trackedThreads.push(...searchResult.threads);
    } else {
      // Fetch messages from main channel
      messages.push(...(await this.fetchMessagesFromChannel(channelId)));
    }

    // Handle threads (if not DM)
    if (!isDm(channel)) {
      // Get threads from messages
      const threadsFromMessages = getThreadsFromMessages(messages, trackedThreads);
      trackedThreads.push(...threadsFromMessages);

      // Get archived threads
      if (this.config.threadProvider) {
        const archivedThreads = await this.config.threadProvider.fetchArchivedThreads(
          channelId,
          trackedThreads,
        );
        trackedThreads.push(...archivedThreads);
      }

      // Fetch messages from all threads
      for (const thread of trackedThreads) {
        this.config.onStatus?.(
          `Retrieving messages from thread: ${getThreadEntityName(thread)}`,
        );
        messages.push(...(await this.fetchMessagesFromChannel(thread.id)));
      }
    }

    return {
      messages,
      threads: trackedThreads,
    };
  }

  /**
   * Fetches all messages from a single channel using pagination
   */
  private async fetchMessagesFromChannel(channelId: string): Promise<Message[]> {
    let messageCount = 0;

    const messages = await this.paginationHelper.paginatedFetch<Message>(
      (lastId) =>
        this.config.apiClient.fetchMessageData(
          this.config.token,
          lastId || "",
          channelId,
        ),
      (batch) => {
        const hasValidMessages = batch[0]?.content || batch[0]?.attachments;
        if (hasValidMessages) {
          messageCount += batch.length;
          this.config.onStatus?.(`Retrieved ${messageCount} messages`);
        }
      },
    );

    return messages.filter((m) => isMessageTypeAllowed(m.type));
  }

  /**
   * Resolves reactions for messages whose `reactions` field is unpopulated
   * (typically the result of Discord's search endpoint, which omits the
   * field). For each input message, fetches a `?around=<id>` window of
   * surrounding messages — those carry reactions inline — and merges
   * them into a `trackMap` keyed by message ID. Within-pass dedup means
   * clustered hits collapse to far fewer Discord calls than messages.
   *
   * Returns a new message array. Messages not pulled into any
   * around-window end up with `reactions: undefined`. Honors
   * `config.shouldStop` for cooperative cancellation; on early break,
   * partially-populated entries are still returned.
   *
   * Public so consumers paginating search results page-by-page (where
   * the public `fetchMessages` entry's full-walk loop is not a fit) can
   * apply Pass 1 enrichment per page without re-implementing the
   * around-window dedup.
   */
  async resolveMessageReactions(messages: Message[]): Promise<Message[]> {
    const trackMap: Record<string, Reaction[]> = {};

    for (const [i, message] of messages.entries()) {
      if (await this.shouldStop()) break;

      if (!trackMap[message.id]) {
        this.config.onStatus?.(
          `Searching reactions (${i + 1}/${messages.length})`,
        );

        const { success, data } = await this.config.apiClient.fetchMessageData(
          this.config.token,
          message.id,
          message.channel_id,
          "around",
        );

        if (success && data) {
          data.forEach((m) => {
            trackMap[m.id] = m.reactions || [];
          });
        }
      }
    }

    return messages.map((message) => ({
      ...message,
      reactions: trackMap[message.id],
    }));
  }

  /**
   * Resolves `referenced_message` for type-19 (REPLY) messages whose
   * pointer is populated but whose parent payload was omitted (typically
   * the result of Discord's search endpoint, which returns
   * message_reference without the inline parent).
   *
   * For each input reply, looks up the parent ID and fetches an
   * `?around=<parent_id>` window of surrounding messages. Each returned
   * message goes into a trackMap keyed by ID, so clustered replies
   * (replies whose parents sit near each other in a channel) collapse to
   * far fewer Discord calls than the raw reply count.
   *
   * Skips:
   * - non-type-19 messages entirely (no API call)
   * - replies that already have `referenced_message` populated
   * - replies whose `message_reference.message_id` is missing
   *
   * Returns a new message array. Replies whose parent could not be
   * resolved (around-fetch failed, or shouldStop fired before the
   * lookup) end up with `referenced_message: undefined`, matching the
   * pre-enrichment shape — the renderer's "Original message was
   * deleted" fallback handles that exactly as it does today.
   *
   * Honors `config.shouldStop` for cooperative cancellation; on early
   * break, partially-populated entries are still returned.
   */
  async resolveMessageReplies(messages: Message[]): Promise<Message[]> {
    const trackMap: Record<string, Message> = {};
    const eligible = messages.filter(
      (m) =>
        m.type === 19 &&
        !m.referenced_message &&
        !!m.message_reference?.message_id,
    );

    for (const [i, message] of eligible.entries()) {
      if (await this.shouldStop()) break;

      const parentId = message.message_reference!.message_id!;
      if (trackMap[parentId]) continue; // already resolved via a prior around-window

      this.config.onStatus?.(
        `Resolving reply parents (${i + 1}/${eligible.length})`,
      );

      const { success, data } = await this.config.apiClient.fetchMessageData(
        this.config.token,
        parentId,
        message.channel_id,
        "around",
      );

      if (success && data) {
        data.forEach((m) => {
          trackMap[m.id] = m;
        });
      }
    }

    return messages.map((message) => {
      if (
        message.type !== 19 ||
        message.referenced_message ||
        !message.message_reference?.message_id
      ) {
        return message;
      }
      const parent = trackMap[message.message_reference.message_id];
      if (!parent) return message;
      return { ...message, referenced_message: parent };
    });
  }

  // Helper methods
  private async shouldStop(): Promise<boolean> {
    if (this.config.shouldStop) return await this.config.shouldStop();
    return false;
  }

  private emitProgress(
    phase: ProgressPhase,
    current: number,
    total: number,
    message: string,
  ): void {
    this.config.onProgress?.({ phase, current, total, message });
  }
}