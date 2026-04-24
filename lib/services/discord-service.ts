import { AppSettings } from "../types/discrub-types.ts";
import { SearchCriteria } from "../types/discrub-types.ts";
import { DiscordApiResponse } from "../types/discrub-types.ts";
import type {
  SearchIterationOptions,
  SearchIterationPage,
} from "../types/discrub/search-iteration.ts";
import {
  ArchivedThreadsResponse,
  ForumThreadSearchResponse,
  Channel,
  Guild,
  GuildChannelModify,
  GuildMemberObject,
  Message,
  MessageModify,
  Role,
  SearchMessageResult,
  ThreadModify,
  User,
} from "../types/discord-types.ts";
import { QueryStringParam, ReactionType } from "../enum/discord-enum.ts";
import { DiscrubSetting } from "../enum/discrub-enum.ts";
import { wait } from "../utils/common-utils.ts";
import { SettingsHelper } from "../utils/settings-utils.ts";

class DiscordService {
  searchDelaySecs = 0;
  deleteDelaySecs = 0;
  delayModifierSecs = 0;
  onRateLimit?: (retryAfter: number) => void;
  onDelay?: (delaySecs: number, delayType: 'search' | 'delete') => void;
  DISCORD_API_URL = "https://discord.com/api/v10";
  DISCORD_USERS_ENDPOINT = `${this.DISCORD_API_URL}/users`;
  DISCORD_GUILDS_ENDPOINT = `${this.DISCORD_API_URL}/guilds`;
  DISCORD_CHANNELS_ENDPOINT = `${this.DISCORD_API_URL}/channels`;

  constructor(settings?: AppSettings) {
    if (settings) {
      this.searchDelaySecs = SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 0);
      this.deleteDelaySecs = SettingsHelper.getNumber(settings, DiscrubSetting.DELETE_DELAY, 0);
      this.delayModifierSecs = SettingsHelper.getNumber(settings, DiscrubSetting.DELAY_MODIFIER, 0);
    }
  }

  generateSnowflake = (date: Date = new Date()): string =>
    ((BigInt(date.valueOf()) - BigInt(1420070400000)) << BigInt(22)).toString();

  calculateRandomNumber = (max: number, min: number = 0) =>
    Math.random() * (max - min) + min;

  private getHeaders(authorization: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      authorization,
    };
  }

  private async withDelay<T>(
    func: () => Promise<DiscordApiResponse<T>>,
    delayType: "search" | "delete" | "none",
  ): Promise<DiscordApiResponse<T>> {
    if (delayType === "none") {
      return func();
    }

    const delaySecs =
      delayType === "search" ? this.searchDelaySecs : this.deleteDelaySecs;

    if (delaySecs > 0) {
      const min = Math.max(delaySecs - this.delayModifierSecs, 0);
      const max = delaySecs + this.delayModifierSecs;
      const delay = this.calculateRandomNumber(max, min);
      if (this.onDelay) {
        this.onDelay(delay, delayType);
      }
      await wait(delay);
    }

    return func();
  }

  withRetry = async <T = void>(
    promise: () => Promise<Response>,
    isBlob: boolean = false,
  ): Promise<DiscordApiResponse<T>> => {
    let apiResponse: DiscordApiResponse<T> = { success: false };
    try {
      let requestComplete = false;
      while (!requestComplete) {
        const response = await promise();
        const { status, ok } = response;
        if (ok) {
          // Request was successful
          requestComplete = true;
          if (status === 200) {
            // Successful request has data
            const data: T = isBlob
              ? await response.blob()
              : await response.json();
            apiResponse = { success: true, status, data: data };
          } else {
            // Successful request does not have data
            apiResponse = { success: true, status };
          }
        } else if (status === 429) {
          // Request must be re-attempted after x seconds
          const json = await response.json();
          this.onRateLimit?.(json.retry_after);
          await wait(json.retry_after);
        } else {
          // Request failed — preserve status for caller to distinguish error types
          requestComplete = true;
          apiResponse = { success: false, status };
          console.error("Request could not be completed", response);
        }
      }
      return apiResponse;
    } catch (e) {
      console.error("Request threw an exception", e);
      return apiResponse;
    }
  };

  private async get<T>(
    url: string,
    authorization: string,
    delayType: "search" | "delete" | "none" = "none",
  ): Promise<DiscordApiResponse<T>> {
    const execute = () =>
      this.withRetry<T>(() =>
        fetch(url, {
          method: "GET",
          headers: this.getHeaders(authorization),
        }),
      );

    return this.withDelay(execute, delayType);
  }

  private async post<T>(
    url: string,
    authorization: string,
    body?: unknown,
  ): Promise<DiscordApiResponse<T>> {
    return this.withRetry<T>(() =>
      fetch(url, {
        method: "POST",
        headers: this.getHeaders(authorization),
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  private async patch<T>(
    url: string,
    authorization: string,
    body: unknown,
  ): Promise<DiscordApiResponse<T>> {
    return this.withDelay(
      () =>
        this.withRetry<T>(() =>
          fetch(url, {
            method: "PATCH",
            headers: this.getHeaders(authorization),
            body: JSON.stringify(body),
          }),
        ),
      "delete",
    );
  }

  private async delete<T = void>(
    url: string,
    authorization: string,
  ): Promise<DiscordApiResponse<T>> {
    return this.withDelay(
      () =>
        this.withRetry<T>(() =>
          fetch(url, {
            method: "DELETE",
            headers: this.getHeaders(authorization),
          }),
        ),
      "delete",
    );
  }

  getUser = (authorization: string, userId: string) =>
    this.get<User>(
      `${this.DISCORD_USERS_ENDPOINT}/${userId}`,
      authorization,
      "search",
    );

  fetchUserData = (authorization: string) =>
    this.get<User>(`${this.DISCORD_USERS_ENDPOINT}/@me`, authorization);

  fetchGuildUser = (guildId: string, userId: string, authorization: string) =>
    this.get<GuildMemberObject>(
      `${this.DISCORD_GUILDS_ENDPOINT}/${guildId}/members/${userId}`,
      authorization,
      "search",
    );

  fetchDirectMessages = (authorization: string) =>
    this.get<Channel[]>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/channels`,
      authorization,
    );

  fetchGuilds = (authorization: string) =>
    this.get<Partial<Guild>[]>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/guilds`,
      authorization,
    );

  fetchRoles = (guildId: string, authorization: string) =>
    this.get<Role[]>(
      `${this.DISCORD_GUILDS_ENDPOINT}/${guildId}/roles`,
      authorization,
    );

  fetchChannels = (authorization: string, guildId: string) =>
    this.get<Channel[]>(
      `${this.DISCORD_GUILDS_ENDPOINT}/${guildId}/channels`,
      authorization,
    );

  fetchChannel = (authorization: string, channelId: string) =>
    this.get<Channel>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}`,
      authorization,
      "search",
    );

  editChannel = (
    authorization: string,
    channelId: string,
    updateObj: ThreadModify | GuildChannelModify,
  ) =>
    this.patch<Channel>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}`,
      authorization,
      updateObj,
    );

  editMessage = (
    authorization: string,
    messageId: string,
    updateProps: MessageModify,
    channelId: string,
  ) =>
    this.patch<Message>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}`,
      authorization,
      updateProps,
    );

  deleteMessage = (
    authorization: string,
    messageId: string,
    channelId: string,
  ) =>
    this.delete(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}`,
      authorization,
    );

  fetchMessageData = (
    authorization: string,
    lastId: string,
    channelId: string,
    queryParam: QueryStringParam = QueryStringParam.BEFORE,
  ) =>
    this.get<Message[]>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages?limit=${
        queryParam === QueryStringParam.AROUND ? "50" : "100"
      }${lastId.length > 0 ? `&${queryParam}=${lastId}` : ""}`,
      authorization,
      "search",
    );

  _getSearchParams = (
    guildId: string | null,
    channelId: string | null,
    searchCriteria: SearchCriteria,
  ): string => {
    const {
      userIds,
      searchAfterDate,
      searchBeforeDate,
      searchMessageContent,
      selectedHasTypes,
      isPinned,
      mentionIds,
      channelIds,
      authorType,
    } = searchCriteria;

    const isDmSearch = !guildId && channelId;

    const urlSearchParams = new URLSearchParams({
      min_id: searchAfterDate
        ? this.generateSnowflake(searchAfterDate)
        : "null",
      max_id: searchBeforeDate
        ? this.generateSnowflake(searchBeforeDate)
        : "null",
      content: searchMessageContent || "null",
      channel_id: isDmSearch ? "null" : channelId || "null",
      include_nsfw: "true",
      pinned: isPinned,
    });

    if (urlSearchParams.get("channel_id") === "null") {
      urlSearchParams.delete("channel_id");
    }

    userIds.forEach((userId: string) => {
      urlSearchParams.append("author_id", userId);
    });
    channelIds.forEach((channelId: string) => {
      urlSearchParams.append("channel_id", channelId);
    });
    mentionIds.forEach((userId: string) => {
      urlSearchParams.append("mentions", userId);
    });
    selectedHasTypes.forEach((type: string) => {
      urlSearchParams.append("has", type);
    });
    if (authorType) {
      urlSearchParams.set("author_type", authorType);
    }
    const nullKeys: string[] = [];
    urlSearchParams.forEach((value, key) => {
      if (value === "null") {
        nullKeys.push(key);
      }
    });
    nullKeys.forEach((key) => {
      urlSearchParams.delete(key);
    });

    return urlSearchParams.toString();
  };

  _getSearchPath = (
    guildId: string | null,
    channelId: string | null,
    offset: number,
    searchCriteria: SearchCriteria,
  ) => {
    const searchParams = this._getSearchParams(
      guildId,
      channelId,
      searchCriteria,
    );
    const endpoint = guildId
      ? this.DISCORD_GUILDS_ENDPOINT
      : this.DISCORD_CHANNELS_ENDPOINT;
    const resourceId = guildId || channelId;
    const offsetQuery = `${offset > 0 ? `&offset=${offset}` : ""}`;
    return `${endpoint}/${resourceId}/messages/search?${searchParams}${
      offsetQuery
    }`;
  };

  fetchSearchMessageData = (
    authorization: string,
    offset: number,
    channelId: string | null,
    guildId: string | null,
    searchCriteria: SearchCriteria,
  ) =>
    this.get<SearchMessageResult>(
      this._getSearchPath(guildId, channelId, offset, searchCriteria),
      authorization,
      "search",
    );

  /**
   * Iterate all messages matching `criteria`, yielding one page at a time.
   *
   * Handles Discord's offset pagination (25 hits per page, max offset 5000)
   * and transparently continues past the 5000-match cap by restarting the
   * search with a `searchAfterDate` boundary set to the last message in the
   * previous batch. Callers that consume this generator will receive every
   * matching message regardless of total count.
   *
   * The generator does NOT delay between pages on its own. Callers inject
   * their own delay + cancellation via `options.onBetweenPages` (return
   * `true` to stop) and `options.shouldStop` (polled before each request).
   *
   * Each yielded page has already been flattened (Discord returns messages
   * as context-groups) and deduplicated against previous pages.
   */
  iterateSearchResults = async function* (
    this: DiscordService,
    options: SearchIterationOptions,
  ): AsyncGenerator<SearchIterationPage, void, void> {
    const SEARCH_PAGE_SIZE = 25;
    const MAX_PER_QUERY = 5000;

    let currentCriteria: SearchCriteria = { ...options.criteria };
    let offset = 0;
    let pageIndex = 0;
    let aggregatedCount = 0;
    let crossedQueryBoundary = false;
    const seen = new Set<string>();

    while (true) {
      if (options.shouldStop && (await options.shouldStop())) return;

      const response = await this.fetchSearchMessageData(
        options.token,
        offset,
        options.channelId,
        options.guildId,
        currentCriteria,
      );

      if (!response.success || !response.data) {
        const err = new Error(
          `Search request failed (HTTP ${response.status ?? "?"})`,
        ) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      const searchResult = response.data as SearchMessageResult;
      const rawMessages = searchResult.messages || [];
      const rawCount = rawMessages.length;
      const flatMessages = Array.isArray(rawMessages[0])
        ? (rawMessages as unknown as Message[][]).flat()
        : (rawMessages as Message[]);

      const pageMessages: Message[] = [];
      for (const m of flatMessages) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          pageMessages.push(m);
        }
      }
      aggregatedCount += pageMessages.length;

      const totalResults = searchResult.total_results ?? 0;

      // Yield every page (including the first, even if empty) so callers can
      // learn totalResults up-front. Subsequent empty pages stop the loop.
      yield {
        messages: pageMessages,
        totalResults,
        pageIndex,
        aggregatedCount,
        crossedQueryBoundary,
      };
      crossedQueryBoundary = false;
      pageIndex++;

      // Discord returns up to 25 groups per page. A partial page is the
      // last page of the current query.
      const isLastPage = rawCount < SEARCH_PAGE_SIZE;
      const nextOffset = offset + rawCount;
      const atOrPastCap = nextOffset >= MAX_PER_QUERY;

      if (isLastPage && !atOrPastCap) return;

      if (atOrPastCap) {
        // Hit the 5000-match cap. Reset offset and seed a searchAfterDate
        // boundary from the oldest-seen message in this batch so the next
        // query picks up where we left off. Matches the pattern used by
        // `loadAllSearchResults` in discrub-web's messageSlice.
        if (flatMessages.length === 0) return;
        const lastMessage = flatMessages[flatMessages.length - 1];
        if (!lastMessage?.timestamp) return;
        currentCriteria = {
          ...currentCriteria,
          searchAfterDate: new Date(lastMessage.timestamp),
        };
        offset = 0;
        crossedQueryBoundary = true;
      } else {
        offset = nextOffset;
      }

      if (options.onBetweenPages) {
        const action = await options.onBetweenPages();
        if (action === true) return;
        if (action === 'reset') {
          // Caller signals Discord's search results shifted (e.g. a
          // purge deleted matching messages). Restart at offset=0 of
          // the current query without clearing `seen` — messages we've
          // already yielded shouldn't be reprocessed if they happen to
          // reappear in the restarted page's context.
          offset = 0;
        }
      }
    }
  };

  fetchPrivateThreads = (authorization: string, channelId: string) =>
    this.get<ArchivedThreadsResponse>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/threads/archived/private`,
      authorization,
      "search",
    );

  fetchPublicThreads = (authorization: string, channelId: string, before?: string) =>
    this.get<ArchivedThreadsResponse>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/threads/archived/public${before ? `?before=${before}` : ''}`,
      authorization,
      "search",
    );

  fetchActiveGuildThreads = (authorization: string, guildId: string) =>
    this.get<ArchivedThreadsResponse>(
      `${this.DISCORD_GUILDS_ENDPOINT}/${guildId}/threads/active`,
      authorization,
      "search",
    );

  fetchJoinedPrivateArchivedThreads = (authorization: string, channelId: string, before?: string) =>
    this.get<ArchivedThreadsResponse>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/users/@me/threads/archived/private${before ? `?before=${before}` : ''}`,
      authorization,
      "search",
    );

  /**
   * Search forum channel threads/posts (works with user tokens)
   * This is the same endpoint Discord's web client uses to list forum posts.
   */
  fetchForumThreadSearch = (
    authorization: string,
    channelId: string,
    options?: {
      sort_by?: 'last_message_time' | 'creation_time';
      sort_order?: 'desc' | 'asc';
      limit?: number;
      offset?: number;
      archived?: boolean;
      name?: string;
      tag_setting?: 'match_some' | 'match_all';
    }
  ) => {
    const params = new URLSearchParams();
    if (options?.sort_by) params.set('sort_by', options.sort_by);
    if (options?.sort_order) params.set('sort_order', options.sort_order);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset != null) params.set('offset', String(options.offset));
    if (options?.archived != null) params.set('archived', String(options.archived));
    if (options?.name) params.set('name', options.name);
    if (options?.tag_setting) params.set('tag_setting', options.tag_setting);
    const query = params.toString();
    return this.get<ForumThreadSearchResponse>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/threads/search${query ? `?${query}` : ''}`,
      authorization,
      "search",
    );
  };

  createDm = (authorization: string, recipient_id: string) =>
    this.post<unknown>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/channels`,
      authorization,
      {
        recipient_id,
      },
    );

  sendFriendRequest = (
    authorization: string,
    props: { username: string; discriminator: string },
  ) =>
    this.post<unknown>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/relationships`,
      authorization,
      props,
    );

  deleteFriendRequest = (authorization: string, userId: string) =>
    this.delete<unknown>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/relationships/${userId}`,
      authorization,
    );

  getRelationships = (authorization: string) =>
    this.get<unknown[]>(
      `${this.DISCORD_USERS_ENDPOINT}/@me/relationships`,
      authorization,
    );

  downloadFile = (downloadUrl: string) =>
    this.withDelay(
      () => this.withRetry<Blob>(() => fetch(downloadUrl), true),
      "search",
    );

  getReactions = (
    authorization: string,
    channelId: string,
    messageId: string,
    emoji: string,
    type: ReactionType,
    lastId?: string | null,
  ) =>
    this.get<User[]>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}/reactions/${emoji}?limit=100&type=${type}${
        lastId ? `&after=${lastId}` : ""
      }`,
      authorization,
      "search",
    );

  deleteReaction = (
    authorization: string,
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
  ) =>
    this.delete(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}/reactions/${emoji}/${userId}`,
      authorization,
    );

  /**
   * Delete all reactions on a message. Requires MANAGE_MESSAGES permission.
   * DELETE /channels/{channelId}/messages/{messageId}/reactions
   */
  deleteAllReactionsFromMessage = (
    authorization: string,
    channelId: string,
    messageId: string,
  ) =>
    this.delete(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}/reactions`,
      authorization,
    );

  /**
   * Delete all reactions for a specific emoji on a message. Requires MANAGE_MESSAGES permission.
   * DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}
   */
  deleteAllReactionsForEmoji = (
    authorization: string,
    channelId: string,
    messageId: string,
    emoji: string,
  ) =>
    this.delete(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}/reactions/${emoji}`,
      authorization,
    );
}

export { DiscordService };
