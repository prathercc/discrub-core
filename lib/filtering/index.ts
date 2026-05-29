// Main filtering function
export {
  filterMessages,
  type FilterMessagesParams,
  type FilterMessagesResult,
} from "./filter-messages.ts";

// Filter management functions
export {
  updateFilters,
  removeFilter,
  clearFilters,
  getActiveFilters,
} from "./filter-manager.ts";

// Filter validators
export {
  hasValidFilterValue,
  isValidTextFilterValue,
  isValidDateFilterValue,
  isValidThreadFilterValue,
  isValidToggleFilterValue,
  isValidArrayFilterValue,
} from "./validators.ts";

// Helper functions (exported for advanced usage)
export {
  applyInverseLogic,
  filterByTimestamp,
  filterByTextContent,
  filterMessageType,
  filterThread,
  createTextContainsCheck,
  TextExtractors,
  type TextExtractor,
  type TimeComparison,
  // #195 cluster A: SearchCriteria active-filter counters promoted from
  // the discrub consumer.
  countActiveFilters,
  countTotalFilters,
  hasActiveSearchFilters,
} from "./helpers.ts";

// Filter handlers (exported for advanced usage)
export { FilterHandlers, type FilterHandler } from "./handlers.ts";