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
   * search with a `searchBeforeDate` (max_id) boundary tightened to the
   * oldest message in the previous batch. Walks newest → oldest within the
   * caller's user-supplied window; never widens the user's bounds.
   *
   * Per Discord's API docs (`docs.discord.com/developers/resources/message`):
   * - "Clients should not rely on the length of the messages array to
   *   paginate results" — search may return fewer than the page size for
   *   index-lag reasons even mid-walk. Termination uses two consecutive
   *   raw-empty pages instead.
   * - "When messages are actively being created or deleted, the
   *   total_results field may not be accurate" — totalResults shifts
   *   between pages signal a reshuffle and trigger an offset=0 reset of
   *   the current query window.
   * - 202 Accepted with `retry_after` is returned when an entity isn't yet
   *   indexed; we sleep and retry the same fetch.
   *
   * The generator does NOT delay between pages on its own. Callers inject
   * their own delay + cancellation via `options.onBetweenPages` (return
   * `true` to stop) and `options.shouldStop` (polled before each request).
   *
   * Discord's search response is shaped `Message[][]` (legacy nested
   * format); under current API each inner array contains the hit only,
   * surrounding context messages are no longer returned. Yielded pages
   * are flattened and deduplicated against previous pages — the dedup
   * Set is harmless under hits-only behavior and protects against any
   * future regression to context-bearing responses.
   */
  iterateSearchResults = async function* (
    this: DiscordService,
    options: SearchIterationOptions,
  ): AsyncGenerator<SearchIterationPage, void, void> {
    const MAX_PER_QUERY = 5000;
    const EMPTY_PAGE_TERMINATE_THRESHOLD = 2;
    const RETRY_AFTER_DEFAULT_SECONDS = 1;

    let currentCriteria: SearchCriteria = { ...options.criteria };
    let offset = 0;
    let pageIndex = 0;
    let aggregatedCount = 0;
    let crossedQueryBoundary = false;
    let prevTotalResults: number | null = null;
    let pendingReset = false;
    let consecutiveEmptyPages = 0;
    const seen = new Set<string>();

    // User-supplied lower bound (snowflake form) for the cap-shift guard.
    // We tighten the upper bound (max_id) at each cap; if that ever drops
    // to or below the user's lower bound, the window has collapsed and we
    // terminate. Discord would return zero matches anyway; the explicit
    // guard saves the wasted call.
    const userLowerBoundSnowflake = options.criteria.searchAfterDate
      ? this.generateSnowflake(options.criteria.searchAfterDate)
      : null;

    while (true) {
      if (options.shouldStop && (await options.shouldStop())) return;

      if (pendingReset) {
        offset = 0;
        pendingReset = false;
      }

      const response = await this.fetchSearchMessageData(
        options.token,
        offset,
        options.channelId,
        options.guildId,
        currentCriteria,
      );

      // 202 Accepted: entity isn't yet indexed. Sleep retry_after and
      // refetch the same offset/criteria. retry_after = 0 means "short
      // delay" — we use a small default.
      if (response.success && response.status === 202) {
        const retryAfter =
          (response.data as { retry_after?: number } | undefined)?.retry_after ?? 0;
        await wait(retryAfter > 0 ? retryAfter : RETRY_AFTER_DEFAULT_SECONDS);
        continue;
      }

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

      // Yield every page (including the first, even if empty) so callers
      // can learn totalResults up-front.
      yield {
        messages: pageMessages,
        totalResults,
        pageIndex,
        aggregatedCount,
        crossedQueryBoundary,
      };
      crossedQueryBoundary = false;
      pageIndex++;

      // Initial-empty fast path: yield once with totalResults=0 + no
      // messages so the caller learns there are zero matches, then
      // terminate. Both conditions matter — total_results can be 0 in
      // tests/mocks while messages are populated (inconsistent fixture
      // shape), and we don't want to terminate on the first page in
      // that case.
      if (totalResults === 0 && pageMessages.length === 0 && pageIndex === 1) return;

      // Termination rule: two consecutive raw-empty pages. Replaces the
      // unsafe "rawCount < page size = done" heuristic that Discord's docs
      // explicitly warn against.
      if (rawCount === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= EMPTY_PAGE_TERMINATE_THRESHOLD) return;
      } else {
        consecutiveEmptyPages = 0;
      }

      // Cap-shift: hit the 5000-match per-query ceiling. Tighten max_id
      // (searchBeforeDate) to the oldest-seen message and restart the
      // window at offset=0. Walk strictly newest→oldest; user's
      // lower bound (searchAfterDate / min_id) is preserved.
      const nextOffset = offset + rawCount;
      const atOrPastCap = nextOffset >= MAX_PER_QUERY;
      if (atOrPastCap) {
        if (flatMessages.length === 0) return;
        const lastMessage = flatMessages[flatMessages.length - 1];
        if (!lastMessage?.timestamp) return;

        const newSearchBeforeDate = new Date(lastMessage.timestamp);
        if (userLowerBoundSnowflake) {
          const newUpperSnowflake = this.generateSnowflake(newSearchBeforeDate);
          if (BigInt(newUpperSnowflake) <= BigInt(userLowerBoundSnowflake)) {
            return;
          }
        }
        currentCriteria = {
          ...currentCriteria,
          searchBeforeDate: newSearchBeforeDate,
        };
        offset = 0;
        crossedQueryBoundary = true;
        prevTotalResults = null;
        consecutiveEmptyPages = 0;
      } else {
        // total_results shift between pages signals reshuffle; reset to
        // offset=0 of the same query window on the next iteration. The
        // `seen` Set carries forward so already-yielded messages don't
        // re-process if they reappear.
        if (prevTotalResults !== null && totalResults !== prevTotalResults) {
          pendingReset = true;
        }
        prevTotalResults = totalResults;

        // Empty page at non-zero offset means results moved out from
        // under us (deletes by mutating consumers, or transient indexer
        // state). Reset to offset=0 so we don't loop on the same
        // stale-empty offset.
        if (rawCount === 0 && offset > 0) {
          pendingReset = true;
        }

        if (!pendingReset) {
          offset = nextOffset;
        }
      }

      if (options.onBetweenPages) {
        const action = await options.onBetweenPages();
        if (action === true) return;
        if (action === 'reset') {
          // Legacy explicit-reset hook. Kept as a safety hatch for
          // callers (and tests) that want manual reset control. The
          // iterator self-detects shifts via total_results so most
          // consumers no longer need this.
          offset = 0;
          pendingReset = false;
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
