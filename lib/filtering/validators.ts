import { isDate } from "date-fns";
import type { Filter } from "../types/discrub-types.ts";
import { FilterType } from "../enum/discrub-enum.ts";

/**
 * Validates if a filter value is considered "empty" or invalid
 * @param filter - The filter to validate
 * @returns true if the filter has a valid, non-empty value
 */
export function hasValidFilterValue(filter: Filter): boolean {
  const { filterType, filterValue } = filter;

  switch (filterType) {
    case FilterType.TEXT:
      return (
        typeof filterValue === "string" ||
        (Array.isArray(filterValue) && filterValue.length > 0)
      );

    case FilterType.DATE:
      return isDate(filterValue) && !!filterValue?.getTime();

    case FilterType.THREAD:
      return (
        typeof filterValue === "string" &&
        filterValue.length > 0
      );

    case FilterType.TOGGLE:
      return filterValue === true;

    case FilterType.ARRAY:
      return Array.isArray(filterValue) && filterValue.length > 0;

    default:
      return false;
  }
}

/**
 * Validates a TEXT filter value
 * @param value - The value to validate
 * @returns true if the value is a valid text filter value
 */
export function isValidTextFilterValue(
  value: unknown,
): value is string | string[] {
  return (
    (typeof value === "string" && value.length > 0) ||
    (Array.isArray(value) && value.length > 0)
  );
}

/**
 * Validates a DATE filter value
 * @param value - The value to validate
 * @returns true if the value is a valid date
 */
export function isValidDateFilterValue(value: unknown): value is Date {
  return isDate(value) && !!(value as Date).getTime();
}

/**
 * Validates a THREAD filter value
 * @param value - The value to validate
 * @returns true if the value is a valid thread ID
 */
export function isValidThreadFilterValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Validates a TOGGLE filter value
 * @param value - The value to validate
 * @returns true if the value is a boolean
 */
export function isValidToggleFilterValue(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Validates an ARRAY filter value
 * @param value - The value to validate
 * @returns true if the value is a non-empty array
 */
export function isValidArrayFilterValue(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0;
}