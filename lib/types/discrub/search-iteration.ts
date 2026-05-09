import type { Message } from "../discord/message";
import type { SearchCriteria } from "./search-criteria";

/**
 * One page yielded by `DiscordService.iterateSearchResults`.
 */
export type SearchIterationPage = {
  /** Deduplicated messages from this page (context-group overlap removed). */
  messages: Message[];
  /** `total_results` from Discord's most recent response (whole-query total). */
  totalResults: number;
  /** 0-based page index, monotonic across `searchAfterDate` continuations. */
  pageIndex: number;
  /** Running total of unique messages yielded so far (post-dedup). */
  aggregatedCount: number;
  /**
   * True on the first page after a 5000-cap `searchAfterDate` restart.
   * Callers can surface this (e.g. status-log note) or ignore it.
   */
  crossedQueryBoundary: boolean;
  /**
   * True when this is a synthetic final yield emitted because the iterator
   * is terminating with `aggregatedCount` substantially less than
   * `totalResults` (Discord stopped serving new matches before the
   * reported total was exhausted — typically search-index churn or a
   * hidden offset cap). Always undefined / false on regular pages.
   * Carries `messages: []`. Callers SHOULD surface a warning to the user
   * when set so silent data loss becomes visible.
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
  /** Initial search criteria. The helper may clone this with an updated
   *  `searchAfterDate` when continuing past the 5000-cap. */
  criteria: SearchCriteria;
  /**
   * Between-pages hook: caller-controlled delay + cancel + reset signal.
   * Return value is one of:
   *   - `true` — stop iteration before the next request
   *   - `'reset'` — mutations (deletes/edits) shifted Discord's search
   *     results; restart from `offset=0` of the current query while
   *     retaining the seen-message dedupe set so previously-yielded
   *     messages aren't reprocessed
   *   - `false` / `void` — continue normally (default)
   *
   * The hook is NOT called after the last page of a query (the iterator
   * exits beforehand), so a caller can safely always return `'reset'`
   * after a mutating batch without worrying about an extra empty fetch
   * at the tail.
   */
  onBetweenPages?: () => Promise<boolean | 'reset' | void> | boolean | 'reset' | void;
  /** Synchronous cancel probe — checked before each request. */
  shouldStop?: () => boolean | Promise<boolean>;
  /**
   * Whether two consecutive zero-NEW-unique pages terminate the
   * iterator. Default `true` — appropriate for **mutating consumers**
   * (purge): when Discord re-serves the same already-seen messages
   * (e.g. type-21 thread starters that can't be deleted), the
   * iterator must stop or it loops forever. See #148 in the consumer
   * repo for the original bug this rule fixes.
   *
   * Set `false` for **read-only consumers** (bulk export): they yield
   * each unique message once and never re-encounter it, so dedup-empty
   * pages mean Discord's index hit a wall (eventual-consistency lag,
   * undocumented offset cap), NOT that the iterator is done. With
   * `false`, the iterator keeps trying via offset advances + resets
   * until either `aggregatedCount` reaches `totalResults` or the
   * safety valve fires (5 consecutive resets that don't advance
   * `aggregatedCount`). When the safety valve fires, the iterator
   * yields one final page with `incomplete: true` before returning,
   * so the caller can surface a warning.
   *
   * Default of `true` keeps existing callers' behavior unchanged.
   */
  terminateOnDedupEmpty?: boolean;
};
