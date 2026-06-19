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
  Emoji,
  Guild,
  GuildChannelModify,
  GuildMemberObject,
  Message,
  MessageCreate,
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

  /**
   * PUT helper. Like `post`, this stays out of the `withDelay` flow —
   * the put-based public methods (addReaction, pinMessage) are expected
   * to be called from loops that already pace themselves externally
   * (see the seed-messages dev tool in discrub-web). withRetry still
   * runs so 429s are handled transparently.
   */
  private async put<T = void>(
    url: string,
    authorization: string,
    body?: unknown,
  ): Promise<DiscordApiResponse<T>> {
    return this.withRetry<T>(() =>
      fetch(url, {
        method: "PUT",
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

  // The guild-list endpoint (/users/@me/guilds) returns partial guilds with
  // no emoji array, so the custom emoji set must be fetched per guild here.
  fetchGuildEmojis = (guildId: string, authorization: string) =>
    this.get<Emoji[]>(
      `${this.DISCORD_GUILDS_ENDPOINT}/${guildId}/emojis`,
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

  /**
   * Post a new message to a channel.
   * POST /channels/{channelId}/messages
   *
   * Does not auto-apply the delete-delay (unlike editMessage /
   * deleteMessage) because the typical caller is a loop that paces
   * itself externally. withRetry still runs so 429 responses are
   * handled transparently.
   */
  postMessage = (
    authorization: string,
    channelId: string,
    body: MessageCreate,
  ) =>
    this.post<Message>(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages`,
      authorization,
      body,
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

  /**
   * Pin a message in a channel. Discord caps pinned messages at 50
   * per channel — beyond that, this returns success: false / status
   * 403, which callers should treat as an expected outcome rather
   * than a fatal error.
   * PUT /channels/{channelId}/pins/{messageId}
   */
  pinMessage = (
    authorization: string,
    channelId: string,
    messageId: string,
  ) =>
    this.put(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/pins/${messageId}`,
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
    const RETRY_AFTER_DEFAULT_SECONDS = 1;
    // Safety net: terminate after this many consecutive empty Discord
    // responses. One empty response usually means the channel is
    // exhausted within the current cap-shifted window; requiring two
    // protects against transient indexer hiccups serving a momentarily-
    // empty page when matches still exist.
    const EMPTY_PAGE_TERMINATE_THRESHOLD = 2;
    // Threshold below which an early termination is "incomplete" enough
    // to warrant a synthetic final-yield with the incomplete flag. 5%
    // slack absorbs Discord-side total_results jitter; the >100 floor
    // suppresses noise on tiny match sets where a few-message gap is
    // normal.
    const INCOMPLETE_RATIO_THRESHOLD = 0.95;
    const INCOMPLETE_MIN_TOTAL = 100;

    let currentCriteria: SearchCriteria = { ...options.criteria };
    let pageIndex = 0;
    let aggregatedCount = 0;
    let consecutiveEmptyResponses = 0;
    let lastTotalResults = 0;
    // Always-cap-shift pagination: each iteration after the first sets
    // `searchBeforeDate = oldestSeenTimestamp`, narrowing the search
    // window past everything we've already yielded. Discord's `max_id`
    // is exclusive, so previously-yielded messages are structurally
    // unreachable on subsequent calls — no dedup `Set` needed, no
    // offset advancement, no reset machinery. This unifies what was
    // previously a 5-state-flag pagination model (`offset`,
    // `pendingReset`, `consecutiveEmptyPages`, `wastedResets`,
    // `prevTotalResults`) into one boundary advance per page.
    let oldestSeenTimestamp: Date | null = null;

    // User-supplied lower bound (snowflake form) for the cap-shift
    // guard. We tighten the upper bound (max_id) every iteration; if
    // that ever drops to or below the user's lower bound, the window
    // has collapsed and we terminate. Discord would return zero
    // matches anyway; the explicit guard saves the wasted call.
    const userLowerBoundSnowflake = options.criteria.searchAfterDate
      ? this.generateSnowflake(options.criteria.searchAfterDate)
      : null;

    // Helper: yield a synthetic final page with incomplete=true if we
    // terminated substantially below totalResults (and the total is
    // big enough to be meaningful). Caller reads the flag and surfaces
    // a warning. No-op when termination was clean.
    const maybeYieldIncomplete = function* (): Generator<SearchIterationPage, void, void> {
      if (
        lastTotalResults > INCOMPLETE_MIN_TOTAL &&
        aggregatedCount < lastTotalResults * INCOMPLETE_RATIO_THRESHOLD
      ) {
        yield {
          messages: [],
          totalResults: lastTotalResults,
          pageIndex,
          aggregatedCount,
          incomplete: true,
        };
      }
    };

    while (true) {
      if (options.shouldStop && (await options.shouldStop())) return;

      // Cap-shift the search window past everything yielded so far.
      // First iteration leaves criteria as user-supplied; subsequent
      // iterations narrow `searchBeforeDate` to the oldest yielded
      // timestamp. Discord's `max_id` is exclusive so the boundary
      // message itself is structurally excluded — no dedup needed.
      if (oldestSeenTimestamp) {
        if (userLowerBoundSnowflake) {
          const newUpperSnowflake = this.generateSnowflake(oldestSeenTimestamp);
          if (BigInt(newUpperSnowflake) <= BigInt(userLowerBoundSnowflake)) {
            // Window collapsed onto user's lower bound — clean termination.
            return;
          }
        }
        currentCriteria = {
          ...currentCriteria,
          searchBeforeDate: oldestSeenTimestamp,
        };
      }

      const response = await this.fetchSearchMessageData(
        options.token,
        0, // always offset=0; pagination is cap-shift via searchBeforeDate
        options.channelId,
        options.guildId,
        currentCriteria,
      );

      // 202 Accepted: entity isn't yet indexed. Sleep retry_after and
      // refetch the same criteria. retry_after = 0 means "short delay"
      // — we use a small default.
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
      const flatMessages = Array.isArray(rawMessages[0])
        ? (rawMessages as unknown as Message[][]).flat()
        : (rawMessages as Message[]);

      // Track oldest timestamp for the next iteration's cap-shift.
      for (const m of flatMessages) {
        if (m.timestamp) {
          const ts = new Date(m.timestamp);
          if (oldestSeenTimestamp === null || ts < oldestSeenTimestamp) {
            oldestSeenTimestamp = ts;
          }
        }
      }
      aggregatedCount += flatMessages.length;

      const totalResults = searchResult.total_results ?? 0;
      lastTotalResults = totalResults;

      // Yield every page (including the first, even if empty) so
      // callers can learn totalResults up-front.
      yield {
        messages: flatMessages,
        totalResults,
        pageIndex,
        aggregatedCount,
      };
      pageIndex++;

      // Initial-empty fast path: yield once with totalResults=0 + no
      // messages so the caller learns there are zero matches, then
      // terminate. Both conditions matter — total_results can be 0 in
      // tests/mocks while messages are populated (inconsistent fixture
      // shape), and we don't want to terminate on the first page in
      // that case.
      if (totalResults === 0 && flatMessages.length === 0 && pageIndex === 1) return;

      // Termination: Discord returned an empty response. Channel is
      // exhausted within the current cap-shifted window. The 2-page
      // threshold absorbs transient indexer hiccups (Discord
      // occasionally serves an empty page when matches still exist;
      // requiring two-in-a-row eliminates the false-positive). With
      // the always-cap-shift model this is the SOLE termination
      // condition beyond the user-lower-bound collapse.
      if (flatMessages.length === 0) {
        consecutiveEmptyResponses++;
        if (consecutiveEmptyResponses >= EMPTY_PAGE_TERMINATE_THRESHOLD) {
          yield* maybeYieldIncomplete();
          return;
        }
      } else {
        consecutiveEmptyResponses = 0;
      }

      // Caller-controlled inter-page hook (delay + cancel). Returning
      // `true` stops iteration before the next request.
      if (options.onBetweenPages) {
        const action = await options.onBetweenPages();
        if (action === true) return;
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
   * Add the current user's reaction to a message.
   *
   * `emoji` should be either a unicode character (e.g. "👍") or a
   * custom emoji identifier in `name:id` form. The endpoint expects
   * the emoji URL-encoded; we encode here so callers pass the raw
   * value.
   *
   * PUT /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me
   */
  addReaction = (
    authorization: string,
    channelId: string,
    messageId: string,
    emoji: string,
  ) =>
    this.put(
      `${this.DISCORD_CHANNELS_ENDPOINT}/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
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
