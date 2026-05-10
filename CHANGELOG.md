# Changelog

All notable changes to `discrub-core` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-05-10

### Added

- **`terminateOnDedupEmpty?: boolean` option on `iterateSearchResults`**
  (default `true` to preserve existing purge behavior). When `false`,
  the iterator no longer terminates after two consecutive dedup-empty
  pages; instead it keeps walking via offset advances + resets until
  either `aggregatedCount` reaches `totalResults` or a safety valve
  fires (5 consecutive resets that fail to advance the aggregated
  count). On safety-valve trip the iterator yields one final synthetic
  page with `incomplete: true` so the consumer can surface a clear
  "stopped early" warning instead of silently producing partial data.
  Read-only consumers (bulk export) should pass `false`; purge-style
  consumers that delete and re-search should keep the default. Driven
  by a real-world bulk export that stalled at 500 of 2,311 matches
  with no warning.

- **`MessageFetchService.resolveMessageReactions` is now public.**
  Promotes the previously-private reaction-enrichment primitive so
  consumers paginating search results page-by-page can apply reaction
  enrichment to each page as it lands, without re-implementing the
  AROUND-window dedup. Behavior is unchanged; internal callers (e.g.
  `fetchMessages`) use the same code path. Five new tests pin the
  public surface: AROUND-window population, per-call `?around=` use,
  within-pass dedup via `trackMap`, `shouldStop` partial-enrichment
  semantics, and the `reactions = undefined` outcome on a failed
  AROUND fetch.

- **`postMessage`, `addReaction`, `pinMessage` on `DiscordService`.**
  Three Discord API methods that were missing from the lib but needed
  by consumer code (Discrub's seed-messages dev tool). All three
  route through the existing `withRetry` wrapper so 429 backoff is
  transparent, matching the guarantee already provided by
  `editMessage` / `deleteMessage`. `pinMessage` uses a new private
  `put<T>` helper. `MessageCreate` is a new minimal type for the
  create-message body (`content`, `message_reference`,
  `allowed_mentions`, `tts`, `flags`); the surface stays narrow until
  a consumer needs more. Tests cover the PUT path's typical 204
  return and the 50-pin-cap 403, `postMessage` with both plain
  content and reply shape, and `addReaction`'s URL-encoding of the
  emoji.

## [1.0.1] - 2026-05-01

### Fixed

- **Search iterator no longer terminates early on large match sets.**
  `iterateSearchResults` previously bailed out after Discord returned a
  short page (`< 25` results), even when far more matches still
  existed. Per Discord's own docs ("Search may return slightly fewer
  results than the limit specified... Clients should not rely on the
  length of the messages array to paginate"), short pages are not a
  reliable end-of-data signal. Termination now waits for two
  consecutive resets that yield zero new unique IDs. This was the root
  cause of a user-reported r/discrub bug where a 24,314-match purge
  stopped at 31 deletions.

- **5000-cap continuation now uses the correct query field.**
  When a search hit Discord's 5000-result cap, the iterator continued
  the next query window using `searchAfterDate` (= `min_id`, the
  *lower* bound), which re-queried the already-walked range. The fix
  uses `searchBeforeDate` (= `max_id`, the *upper* bound) of the
  oldest seen message, walking strictly forward into older results.
  Did not affect users below the 5000 cap; will affect anyone above
  it.

- **Index-reshuffle reset is now self-detected via `total_results`
  change.** Previously the consumer had to signal a reset between
  delete batches via `onBetweenPages: () => 'reset'`. The iterator
  now watches Discord's `total_results` field across pages and
  resets to `offset=0` of the same query when it shifts. The
  caller-provided `'reset'` signal remains supported as a safety
  hatch for tests and future consumers.

- **`202 Accepted` (`retry_after`) responses from Discord's search
  endpoint are now handled.** When the search index has not yet been
  built for a freshly-imported or recently-rebuilt channel, Discord
  returns `202` with a `retry_after` duration. The iterator now
  sleeps the indicated duration and retries the same fetch instead
  of treating the response as a failure.

- **Trailing search loop on fully-deduplicated pages.** A separate
  fix on top of the rewrite: when Discord kept returning the same
  set of (already-seen) messages — typically system messages like
  type-21 thread starters — the previous "rawCount === 0"
  termination check looped forever. Now keys off `pageMessages.length
  === 0` after dedup, so the loop terminates cleanly even when
  Discord is repeatedly returning the same dedup-eaten results.

### Internal

- 16 new iterator-focused tests cover all of the above scenarios:
  total-results-shift reset, short-page-doesn't-terminate, cap
  continuation field correctness, user-supplied `searchBeforeDate`
  preservation, cap-shift-below-user-min termination, empty-initial,
  index-lag dedup termination, mid-loop `shouldStop`, `202` retry,
  and dedup-eaten page termination.

## [1.0.0] - 2026-04-27

Initial release on npm. Renamed from the internal `discrub-lib`
package. See `memory/project_discrub_core_publish.md` in the
consumer repo for the full migration history (security sweep,
license posture, version rationale, build hygiene additions).