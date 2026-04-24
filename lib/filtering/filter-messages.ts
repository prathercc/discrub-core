import type { Message, Channel } from "../types/discord-types.ts";
import type { Filter } from "../types/discrub-types.ts";
import { FilterName } from "../enum/discrub-enum.ts";
import { FilterHandlers } from "./handlers.ts";

/**
 * Parameters for the filterMessages function
 */
export interface FilterMessagesParams {
  /** Array of messages to filter */
  messages: Message[];
  /** Array of filters to apply */
  filters: Filter[];
  /** Array of threads (needed for MESSAGE_TYPE filter) */
  threads: Channel[];
  /** Array of selected message IDs to filter down based on filtered results */
  selectedMessageIds: string[];
}

/**
 * Result of the filterMessages function
 */
export interface FilterMessagesResult {
  /** Messages that passed all filters */
  filteredMessages: Message[];
  /** Selected message IDs that are still in the filtered results */
  selectedMessageIds: string[];
}

/**
 * Pure function to filter messages based on provided filters
 * This is the main entry point for message filtering logic
 *
 * @param params - FilterMessagesParams containing messages, filters, threads, and selected message IDs
 * @returns FilterMessagesResult containing filtered messages and updated selected message IDs
 *
 * @example
 * ```typescript
 * const result = filterMessages({
 *   messages: allMessages,
 *   filters: [
 *     { filterType: FilterType.TEXT, filterName: FilterName.CONTENT, filterValue: "hello" }
 *   ],
 *   threads: [],
 *   selectedMessageIds: ["123", "456"]
 * });
 * ```
 */
export function filterMessages(
  params: FilterMessagesParams,
): FilterMessagesResult {
  const { messages, filters, threads, selectedMessageIds } = params;

  // Check if inverse filter is active
  const inverseActive = filters
    .filter((f) => f.filterName)
    .some((filter) => filter.filterName === FilterName.INVERSE);

  // Check if there are no meaningful filters
  const hasNoMeaningfulFilters =
    filters.length === 0 || (filters.length === 1 && inverseActive);

  // Early return if no meaningful filters
  if (hasNoMeaningfulFilters) {
    return {
      filteredMessages: messages,
      selectedMessageIds: messages
        .filter((m) => selectedMessageIds.some((mId) => m.id === mId))
        .map((m) => m.id),
    };
  }

  // Apply all filters to all messages using FilterHandlers map
  const filteredMessages = messages.filter((message) =>
    filters.every((filter) => {
      if (!filter.filterValue) return true;

      const handler = FilterHandlers[filter.filterType];
      if (!handler) return true;

      return handler(filter, message, inverseActive, threads);
    }),
  );

  // Update selected messages to only include those in filtered results
  const filteredSelectedIds = filteredMessages
    .filter((m) => selectedMessageIds.includes(m.id))
    .map((m) => m.id);

  return {
    filteredMessages,
    selectedMessageIds: filteredSelectedIds,
  };
}