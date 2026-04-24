import { describe, it, expect } from 'vitest';
import {
  updateFilters,
  removeFilter,
  clearFilters,
  getActiveFilters,
} from './filter-manager.ts';
import { FilterType, FilterName } from '../enum/discrub-enum.ts';
import type { Filter } from '../types/discrub-types.ts';

describe('filter-manager', () => {
  describe('updateFilters', () => {
    describe('TEXT Filter', () => {
      it('should add new TEXT filter with valid value', () => {
        const filters: Filter[] = [];
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newFilter);
      });

      it('should update existing TEXT filter', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: 'old value',
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'new value',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toBe('new value');
      });

      it('should keep TEXT filter even with empty string (empty string is valid)', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: 'hello',
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: '',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toBe('');
      });

      it('should remove TEXT filter when value is empty array', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: ['hello'],
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: [],
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(0);
      });

      it('should handle TEXT filter with array value', () => {
        const filters: Filter[] = [];
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: ['hello', 'world'],
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toEqual(['hello', 'world']);
      });
    });

    describe('DATE Filter', () => {
      it('should add new DATE filter with valid date', () => {
        const filters: Filter[] = [];
        const testDate = new Date('2024-01-15');
        const newFilter: Filter = {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: testDate,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newFilter);
      });

      it('should update existing DATE filter', () => {
        const oldDate = new Date('2024-01-01');
        const newDate = new Date('2024-01-15');
        const filters: Filter[] = [
          {
            filterType: FilterType.DATE,
            filterName: FilterName.START_TIME,
            filterValue: oldDate,
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: newDate,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toEqual(newDate);
      });

      it('should remove DATE filter when value is not a valid date', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.DATE,
            filterName: FilterName.START_TIME,
            filterValue: new Date('2024-01-15'),
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: 'invalid' as any,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(0);
      });

      it('should handle both START_TIME and END_TIME filters', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.DATE,
            filterName: FilterName.START_TIME,
            filterValue: new Date('2024-01-01'),
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.DATE,
          filterName: FilterName.END_TIME,
          filterValue: new Date('2024-01-31'),
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(2);
        expect(result[0].filterName).toBe(FilterName.START_TIME);
        expect(result[1].filterName).toBe(FilterName.END_TIME);
      });
    });

    describe('THREAD Filter', () => {
      it('should add new THREAD filter', () => {
        const filters: Filter[] = [];
        const newFilter: Filter = {
          filterType: FilterType.THREAD,
          filterName: FilterName.THREAD,
          filterValue: 'thread-123',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newFilter);
      });

      it('should replace existing THREAD filter (only one allowed)', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.THREAD,
            filterName: FilterName.THREAD,
            filterValue: 'thread-old',
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.THREAD,
          filterName: FilterName.THREAD,
          filterValue: 'thread-new',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toBe('thread-new');
      });

      it('should remove THREAD filter when value is empty', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.THREAD,
            filterName: FilterName.THREAD,
            filterValue: 'thread-123',
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.THREAD,
          filterName: FilterName.THREAD,
          filterValue: '',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(0);
      });

      it('should preserve non-THREAD filters when updating THREAD', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: 'hello',
          },
          {
            filterType: FilterType.THREAD,
            filterName: FilterName.THREAD,
            filterValue: 'thread-old',
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.THREAD,
          filterName: FilterName.THREAD,
          filterValue: 'thread-new',
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(2);
        expect(result.find(f => f.filterType === FilterType.TEXT)).toBeDefined();
        expect(result.find(f => f.filterType === FilterType.THREAD)?.filterValue).toBe('thread-new');
      });
    });

    describe('TOGGLE Filter', () => {
      it('should add TOGGLE filter when value is true', () => {
        const filters: Filter[] = [];
        const newFilter: Filter = {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newFilter);
      });

      it('should remove TOGGLE filter when value is false', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TOGGLE,
            filterName: FilterName.INVERSE,
            filterValue: true,
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: false,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(0);
      });

      it('should update existing TOGGLE filter', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TOGGLE,
            filterName: FilterName.INVERSE,
            filterValue: false,
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toBe(true);
      });
    });

    describe('ARRAY Filter', () => {
      it('should add new ARRAY filter with values', () => {
        const filters: Filter[] = [];
        const newFilter: Filter = {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: ['0', '19'],
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newFilter);
      });

      it('should update existing ARRAY filter', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.ARRAY,
            filterName: FilterName.MESSAGE_TYPE,
            filterValue: ['0'],
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: ['0', '19', '20'],
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(1);
        expect(result[0].filterValue).toEqual(['0', '19', '20']);
      });

      it('should remove ARRAY filter when value is empty array', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.ARRAY,
            filterName: FilterName.MESSAGE_TYPE,
            filterValue: ['0', '19'],
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: [],
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(0);
      });
    });

    describe('Mixed Filter Updates', () => {
      it('should handle multiple filter types together', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: 'hello',
          },
          {
            filterType: FilterType.DATE,
            filterName: FilterName.START_TIME,
            filterValue: new Date('2024-01-01'),
          },
        ];
        const newFilter: Filter = {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        };

        const result = updateFilters(filters, newFilter);

        expect(result).toHaveLength(3);
        expect(result.find(f => f.filterType === FilterType.TEXT)).toBeDefined();
        expect(result.find(f => f.filterType === FilterType.DATE)).toBeDefined();
        expect(result.find(f => f.filterType === FilterType.TOGGLE)).toBeDefined();
      });

      it('should not mutate original filters array', () => {
        const filters: Filter[] = [
          {
            filterType: FilterType.TEXT,
            filterName: FilterName.CONTENT,
            filterValue: 'hello',
          },
        ];
        const originalLength = filters.length;
        const newFilter: Filter = {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'world',
        };

        const result = updateFilters(filters, newFilter);

        expect(filters).toHaveLength(originalLength);
        expect(filters[0].filterValue).toBe('hello');
        expect(result).not.toBe(filters);
      });
    });
  });

  describe('removeFilter', () => {
    it('should remove filter by name', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
        {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: new Date('2024-01-01'),
        },
      ];

      const result = removeFilter(filters, FilterName.CONTENT);

      expect(result).toHaveLength(1);
      expect(result[0].filterName).toBe(FilterName.START_TIME);
    });

    it('should handle removing non-existent filter', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
      ];

      const result = removeFilter(filters, FilterName.START_TIME);

      expect(result).toHaveLength(1);
      expect(result[0].filterName).toBe(FilterName.CONTENT);
    });

    it('should handle empty filters array', () => {
      const filters: Filter[] = [];

      const result = removeFilter(filters, FilterName.CONTENT);

      expect(result).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
      ];

      const result = removeFilter(filters, FilterName.CONTENT);

      expect(filters).toHaveLength(1);
      expect(result).not.toBe(filters);
    });
  });

  describe('clearFilters', () => {
    it('should return empty array', () => {
      const result = clearFilters();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should always return new empty array', () => {
      const result1 = clearFilters();
      const result2 = clearFilters();

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result1).not.toBe(result2);
    });
  });

  describe('getActiveFilters', () => {
    it('should return filters with valid values', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(2);
    });

    it('should include TEXT filters even with empty string (empty string is valid)', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.ATTACHMENT_NAME,
          filterValue: '',
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(2);
      expect(result.find(f => f.filterName === FilterName.CONTENT)).toBeDefined();
      expect(result.find(f => f.filterName === FilterName.ATTACHMENT_NAME)).toBeDefined();
    });

    it('should filter out ARRAY filters with empty array', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: ['0', '19'],
        },
        {
          filterType: FilterType.ARRAY,
          filterName: 'other' as FilterName,
          filterValue: [],
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(1);
      expect(result[0].filterName).toBe(FilterName.MESSAGE_TYPE);
    });

    it('should filter out TOGGLE filters with false value', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: 'other' as FilterName,
          filterValue: false,
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(1);
      expect(result[0].filterName).toBe(FilterName.INVERSE);
    });

    it('should handle mixed valid and invalid filters', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.ATTACHMENT_NAME,
          filterValue: '',
        },
        {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: new Date('2024-01-01'),
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: false,
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(3);
      expect(result.find(f => f.filterName === FilterName.CONTENT)).toBeDefined();
      expect(result.find(f => f.filterName === FilterName.ATTACHMENT_NAME)).toBeDefined();
      expect(result.find(f => f.filterName === FilterName.START_TIME)).toBeDefined();
    });

    it('should filter out only invalid filters (TOGGLE false, ARRAY empty)', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: '',
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: false,
        },
        {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: [],
        },
      ];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(1);
      expect(result[0].filterName).toBe(FilterName.CONTENT);
    });

    it('should handle empty filters array', () => {
      const filters: Filter[] = [];

      const result = getActiveFilters(filters);

      expect(result).toHaveLength(0);
    });
  });
});
