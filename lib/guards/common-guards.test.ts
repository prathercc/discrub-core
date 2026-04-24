import { describe, it, expect } from 'vitest';
import { isNonNullable } from './common-guards.ts';

describe('common-guards', () => {
  describe('isNonNullable', () => {
    it('should return false for null', () => {
      expect(isNonNullable(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNonNullable(undefined)).toBe(false);
    });

    it('should return true for number 0', () => {
      expect(isNonNullable(0)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isNonNullable('')).toBe(true);
    });

    it('should return true for false boolean', () => {
      expect(isNonNullable(false)).toBe(true);
    });

    it('should return true for positive number', () => {
      expect(isNonNullable(42)).toBe(true);
    });

    it('should return true for non-empty string', () => {
      expect(isNonNullable('hello')).toBe(true);
    });

    it('should return true for object', () => {
      expect(isNonNullable({ key: 'value' })).toBe(true);
    });

    it('should return true for array', () => {
      expect(isNonNullable([1, 2, 3])).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isNonNullable([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isNonNullable({})).toBe(true);
    });

    it('should work as type guard in filter', () => {
      const values = [1, null, 2, undefined, 3, 0];
      const filtered = values.filter(isNonNullable);

      expect(filtered).toEqual([1, 2, 3, 0]);
      expect(filtered).toHaveLength(4);
    });

    it('should narrow types correctly', () => {
      const value: string | null | undefined = 'test';

      if (isNonNullable(value)) {
        // Type should be narrowed to string here
        expect(value.length).toBe(4);
      }
    });
  });
});
