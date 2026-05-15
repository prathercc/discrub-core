import type { Message } from "../discord/message";
import type { SearchCriteria } from "./search-criteria";

/**
 * One page yielded by `DiscordService.iterateSearchResults`.
 */
export type SearchIterationPage = {
  /** Messages from this page (Discord's nested-array response flattened). */
  messages: Message[];
  /** `total_results` from Discord's most recent response (whole-query total). */
  totalResults: number;
  /** 0-based page index, monotonic across cap-shift iterations. */
  pageIndex: number;
  /** Running total of messages yielded so far across all pages. */
  aggregatedCount: number;
  /**
   * True when this is a synthetic final yield emitted because the
   * iterator is terminating with `aggregatedCount` substantially less
   * than `totalResults` (Discord stopped serving new matches before
   * the reported total was exhausted — typically search-index churn
   * or transient indexer state). Always undefined / false on regular
   * pages. Carries `messages: []`. Callers SHOULD surface a warning
   * to the user when set so silent data loss becomes visible.
   */
  incomplete?: boolean;
};

export type SearchIterationOptions = {
  /** Discord auth token. */
  token: string;
  /** Channel (or DM) to search, or `null` when searching guild-wide. */
  channelId: string | null;
  /** Guild to search, or `null` for DM/single-channel search. */
  guildId: string | null;
  /**
   * Initial search criteria. The iterator clones this and updates
   * `searchBeforeDate` on every page after the first to advance the
   * cap-shift window past already-yielded messages.
   */
  criteria: SearchCriteria;
  /**
   * Between-pages hook: caller-controlled delay + cancel.
   * Return value:
   *   - `true` — stop iteration before the next request
   *   - `false` / `void` — continue normally (default)
   *
   * The hook is NOT called after the last page (the iterator exits
   * beforehand), so callers don't need to reason about an extra empty
   * fetch at the tail.
   */
  onBetweenPages?: () => Promise<boolean | void> | boolean | void;
  /** Synchronous cancel probe — checked before each request. */
  shouldStop?: () => boolean | Promise<boolean>;
};
