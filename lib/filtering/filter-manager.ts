import type { Filter } from "../types/discrub-types.ts";
import { FilterType } from "../enum/discrub-enum.ts";
import { hasValidFilterValue } from "./validators.ts";

/**
 * Pure function to update a filters array with a new filter
 * Handles add/update/remove logic based on filter type and value
 *
 * @param currentFilters - Current array of filters
 * @param newFilter - Filter to add/update/remove
 * @returns Updated filters array
 *
 * @example
 * ```typescript
 * const filters = [
 *   { filterType: FilterType.TEXT, filterName: FilterName.CONTENT, filterValue: "hello" }
 * ];
 *
 * const updated = updateFilters(filters, {
 *   filterType: FilterType.TEXT,
 *   filterName: FilterName.CONTENT,
 *   filterValue: "world"
 * });
 * // Result: [{ filterType: FilterType.TEXT, filterName: FilterName.CONTENT, filterValue: "world" }]
 * ```
 */
export function updateFilters(
  currentFilters: Filter[],
  newFilter: Filter,
): Filter[] {
  const { filterName, filterType } = newFilter;

  // Remove any existing filter with the same filterName
  const filteredList = currentFilters.filter((x) => x.filterName !== filterName);

  // Handle each filter type
  switch (filterType) {
    case FilterType.TEXT:
      return handleTextFilter(filteredList, newFilter);

    case FilterType.DATE:
      return handleDateFilter(filteredList, newFilter);

    case FilterType.THREAD:
      return handleThreadFilter(currentFilters, newFilter);

    case FilterType.TOGGLE:
      return handleToggleFilter(filteredList, newFilter);

    case FilterType.ARRAY:
      return handleArrayFilter(filteredList, newFilter);

    default:
      return currentFilters;
  }
}

/**
 * Handles TEXT filter updates
 * Adds filter if value has content, removes if empty
 */
function handleTextFilter(
  filteredList: Filter[],
  newFilter: Filter,
): Filter[] {
  if (hasValidFilterValue(newFilter)) {
    return [...filteredList, newFilter];
  }
  return filteredList;
}

/**
 * Handles DATE filter updates
 * Adds filter if it's a valid date with time, removes if invalid
 */
function handleDateFilter(
  filteredList: Filter[],
  newFilter: Filter,
): Filter[] {
  if (hasValidFilterValue(newFilter)) {
    return [...filteredList, newFilter];
  }
  return filteredList;
}

/**
 * Handles THREAD filter updates
 * Special case: removes ALL thread filters first, then adds if valid
 * This ensures only one THREAD filter can be active at a time
 */
function handleThreadFilter(
  currentFilters: Filter[],
  newFilter: Filter,
): Filter[] {
  // Remove all THREAD type filters (special case for thread filters)
  const withoutThreadFilters = currentFilters.filter(
    (f) => f.filterType !== FilterType.THREAD,
  );

  if (hasValidFilterValue(newFilter)) {
    return [...withoutThreadFilters, newFilter];
  }
  return withoutThreadFilters;
}

/**
 * Handles TOGGLE filter updates
 * Adds filter if value is true, removes if false
 */
function handleToggleFilter(
  filteredList: Filter[],
  newFilter: Filter,
): Filter[] {
  if (newFilter.filterValue === true) {
    return [...filteredList, newFilter];
  }
  // If toggle is false, just return the filtered list (filter removed)
  return filteredList;
}

/**
 * Handles ARRAY filter updates
 * Adds filter if array has items, removes if empty
 */
function handleArrayFilter(
  filteredList: Filter[],
  newFilter: Filter,
): Filter[] {
  if (hasValidFilterValue(newFilter)) {
    return [...filteredList, newFilter];
  }
  return filteredList;
}

/**
 * Removes a filter by name
 * @param currentFilters - Current array of filters
 * @param filterName - Name of the filter to remove
 * @returns Updated filters array without the specified filter
 */
export function removeFilter(
  currentFilters: Filter[],
  filterName: string,
): Filter[] {
  return currentFilters.filter((f) => f.filterName !== filterName);
}

/**
 * Removes all filters
 * @returns Empty filters array
 */
export function clearFilters(): Filter[] {
  return [];
}

/**
 * Gets all active filters (filters with valid values)
 * @param currentFilters - Current array of filters
 * @returns Array of filters with valid values
 */
export function getActiveFilters(currentFilters: Filter[]): Filter[] {
  return currentFilters.filter(hasValidFilterValue);
}