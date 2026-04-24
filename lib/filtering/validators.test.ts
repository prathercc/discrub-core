import { describe, it, expect } from 'vitest';
import {
  hasValidFilterValue,
  isValidTextFilterValue,
  isValidDateFilterValue,
  isValidThreadFilterValue,
  isValidToggleFilterValue,
  isValidArrayFilterValue,
} from './validators.ts';
import { FilterType, FilterName } from '../enum/discrub-enum.ts';
import type { Filter } from '../types/discrub-types.ts';

describe('Filter Validators', () => {
  describe('Validation Functions', () => {
    it('should validate text filter values', () => {
      // Valid string
      expect(isValidTextFilterValue('hello')).toBe(true);

      // Valid array
      expect(isValidTextFilterValue(['hello', 'world'])).toBe(true);

      // Invalid: empty string
      expect(isValidTextFilterValue('')).toBe(false);

      // Invalid: empty array
      expect(isValidTextFilterValue([])).toBe(false);

      // Invalid: null
      expect(isValidTextFilterValue(null)).toBe(false);

      // Invalid: undefined
      expect(isValidTextFilterValue(undefined)).toBe(false);

      // Invalid: number
      expect(isValidTextFilterValue(123)).toBe(false);
    });

    it('should validate date filter values', () => {
      // Valid date
      expect(isValidDateFilterValue(new Date('2024-01-15'))).toBe(true);

      // Invalid: string
      expect(isValidDateFilterValue('2024-01-15')).toBe(false);

      // Invalid: number
      expect(isValidDateFilterValue(1705276800000)).toBe(false);

      // Invalid: null
      expect(isValidDateFilterValue(null)).toBe(false);

      // Invalid: undefined
      expect(isValidDateFilterValue(undefined)).toBe(false);

      // Invalid: object
      expect(isValidDateFilterValue({})).toBe(false);
    });

    it('should validate thread filter values', () => {
      // Valid thread ID
      expect(isValidThreadFilterValue('thread-123')).toBe(true);

      // Invalid: empty string
      expect(isValidThreadFilterValue('')).toBe(false);

      // Invalid: null
      expect(isValidThreadFilterValue(null)).toBe(false);

      // Invalid: undefined
      expect(isValidThreadFilterValue(undefined)).toBe(false);

      // Invalid: number
      expect(isValidThreadFilterValue(123)).toBe(false);

      // Invalid: array
      expect(isValidThreadFilterValue(['thread-123'])).toBe(false);
    });

    it('should validate toggle filter values', () => {
      // Valid: true
      expect(isValidToggleFilterValue(true)).toBe(true);

      // Valid: false
      expect(isValidToggleFilterValue(false)).toBe(true);

      // Invalid: string
      expect(isValidToggleFilterValue('true')).toBe(false);

      // Invalid: number
      expect(isValidToggleFilterValue(1)).toBe(false);

      // Invalid: null
      expect(isValidToggleFilterValue(null)).toBe(false);

      // Invalid: undefined
      expect(isValidToggleFilterValue(undefined)).toBe(false);
    });

    it('should validate array filter values', () => {
      // Valid: non-empty array
      expect(isValidArrayFilterValue(['value1', 'value2'])).toBe(true);

      // Valid: single item array
      expect(isValidArrayFilterValue(['value'])).toBe(true);

      // Invalid: empty array
      expect(isValidArrayFilterValue([])).toBe(false);

      // Invalid: string
      expect(isValidArrayFilterValue('value')).toBe(false);

      // Invalid: null
      expect(isValidArrayFilterValue(null)).toBe(false);

      // Invalid: undefined
      expect(isValidArrayFilterValue(undefined)).toBe(false);

      // Invalid: object
      expect(isValidArrayFilterValue({})).toBe(false);
    });
  });

  describe('hasValidFilterValue', () => {
    it('should validate TEXT filter', () => {
      const validFilter: Filter = {
        filterType: FilterType.TEXT,
        filterName: FilterName.CONTENT,
        filterValue: 'hello',
      };
      expect(hasValidFilterValue(validFilter)).toBe(true);

      // Empty string is still a string type, so hasValidFilterValue returns true
      const emptyStringFilter: Filter = {
        filterType: FilterType.TEXT,
        filterName: FilterName.CONTENT,
        filterValue: '',
      };
      expect(hasValidFilterValue(emptyStringFilter)).toBe(true);

      // Invalid: non-string, non-array
      const invalidFilter: Filter = {
        filterType: FilterType.TEXT,
        filterName: FilterName.CONTENT,
        filterValue: 123,
      };
      expect(hasValidFilterValue(invalidFilter)).toBe(false);
    });

    it('should validate DATE filter', () => {
      const validFilter: Filter = {
        filterType: FilterType.DATE,
        filterName: FilterName.START_TIME,
        filterValue: new Date('2024-01-15'),
      };
      expect(hasValidFilterValue(validFilter)).toBe(true);

      const invalidFilter: Filter = {
        filterType: FilterType.DATE,
        filterName: FilterName.START_TIME,
        filterValue: '2024-01-15',
      };
      expect(hasValidFilterValue(invalidFilter)).toBe(false);
    });

    it('should validate THREAD filter', () => {
      const validFilter: Filter = {
        filterType: FilterType.THREAD,
        filterName: FilterName.THREAD,
        filterValue: 'thread-123',
      };
      expect(hasValidFilterValue(validFilter)).toBe(true);

      const invalidFilter: Filter = {
        filterType: FilterType.THREAD,
        filterName: FilterName.THREAD,
        filterValue: '',
      };
      expect(hasValidFilterValue(invalidFilter)).toBe(false);
    });

    it('should validate TOGGLE filter', () => {
      const validFilter: Filter = {
        filterType: FilterType.TOGGLE,
        filterName: FilterName.INVERSE,
        filterValue: true,
      };
      expect(hasValidFilterValue(validFilter)).toBe(true);

      const invalidFilter: Filter = {
        filterType: FilterType.TOGGLE,
        filterName: FilterName.INVERSE,
        filterValue: false,
      };
      expect(hasValidFilterValue(invalidFilter)).toBe(false);
    });

    it('should validate ARRAY filter', () => {
      const validFilter: Filter = {
        filterType: FilterType.ARRAY,
        filterName: FilterName.MESSAGE_TYPE,
        filterValue: ['0', '19'],
      };
      expect(hasValidFilterValue(validFilter)).toBe(true);

      const invalidFilter: Filter = {
        filterType: FilterType.ARRAY,
        filterName: FilterName.MESSAGE_TYPE,
        filterValue: [],
      };
      expect(hasValidFilterValue(invalidFilter)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      expect(isValidTextFilterValue(null)).toBe(false);
      expect(isValidDateFilterValue(null)).toBe(false);
      expect(isValidThreadFilterValue(null)).toBe(false);
      expect(isValidToggleFilterValue(null)).toBe(false);
      expect(isValidArrayFilterValue(null)).toBe(false);
    });

    it('should handle undefined values', () => {
      expect(isValidTextFilterValue(undefined)).toBe(false);
      expect(isValidDateFilterValue(undefined)).toBe(false);
      expect(isValidThreadFilterValue(undefined)).toBe(false);
      expect(isValidToggleFilterValue(undefined)).toBe(false);
      expect(isValidArrayFilterValue(undefined)).toBe(false);
    });

    it('should handle empty strings/arrays', () => {
      expect(isValidTextFilterValue('')).toBe(false);
      expect(isValidTextFilterValue([])).toBe(false);
      expect(isValidThreadFilterValue('')).toBe(false);
      expect(isValidArrayFilterValue([])).toBe(false);
    });
  });
});
