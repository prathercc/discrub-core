import type { Message, Channel } from "../types/discord-types.ts";
import type { Filter } from "../types/discrub-types.ts";
import { FilterName, FilterType } from "../enum/discrub-enum.ts";
import {
  filterByTextContent,
  filterByTimestamp,
  filterMessageType,
  filterThread,
  TextExtractors,
} from "./helpers.ts";

/**
 * Filter handler function type
 * @param param - The filter to apply
 * @param message - The message to filter
 * @param inverseActive - Whether inverse filtering is enabled
 * @param threads - Array of threads (needed for MESSAGE_TYPE filter)
 * @returns true if message should be included, false otherwise
 */
export type FilterHandler = (
  param: Filter,
  message: Message,
  inverseActive: boolean,
  threads: Channel[],
) => boolean;

/**
 * Filter handler map for different filter types
 * Eliminates cascading if-else chains by mapping filter types to their handlers
 */
export const FilterHandlers: Record<FilterType, FilterHandler> = {
  [FilterType.TEXT]: (param, message, inverseActive) => {
    // Type guard: ensure filterValue is a string or string array
    if (
      !param.filterValue ||
      (typeof param.filterValue !== "string" &&
        !Array.isArray(param.filterValue))
    ) {
      return true;
    }

    if (param.filterName === FilterName.ATTACHMENT_NAME) {
      return filterByTextContent(
        param.filterValue,
        message,
        inverseActive,
        TextExtractors.attachments,
        false, // Case insensitive
      );
    }
    if (param.filterName === FilterName.CONTENT) {
      return filterByTextContent(
        param.filterValue,
        message,
        inverseActive,
        TextExtractors.contentAndEmbeds,
      );
    }
    // Default text filter for other message properties
    return filterByTextContent(
      param.filterValue,
      message,
      inverseActive,
      TextExtractors.property(param.filterName as keyof Message),
    );
  },

  [FilterType.DATE]: (param, message, inverseActive) => {
    // Type guard: ensure filterValue is a Date
    if (!param.filterValue || !(param.filterValue instanceof Date)) return true;

    if (param.filterName === FilterName.START_TIME) {
      return filterByTimestamp(
        param.filterValue,
        message,
        inverseActive,
        "after",
      );
    }
    if (param.filterName === FilterName.END_TIME) {
      return filterByTimestamp(
        param.filterValue,
        message,
        inverseActive,
        "before",
      );
    }
    return true;
  },

  [FilterType.THREAD]: (param, message, inverseActive) => {
    // Type guard: ensure filterValue is a string
    if (!param.filterValue || typeof param.filterValue !== "string")
      return true;

    return filterThread(param.filterValue, message, inverseActive);
  },

  [FilterType.ARRAY]: (param, message, inverseActive, threads) => {
    if (param.filterName === FilterName.MESSAGE_TYPE) {
      return filterMessageType(
        param.filterValue,
        message,
        inverseActive,
        threads,
      );
    }
    return true;
  },

  [FilterType.TOGGLE]: () => true, // Toggle filters don't filter messages, they just enable/disable features
};