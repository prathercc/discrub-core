import { describe, it, expect, vi } from 'vitest';
import { wait, MapUtils } from './common-utils.ts';

describe('common-utils', () => {
  describe('wait', () => {
    it('should wait for specified seconds', async () => {
      const startTime = Date.now();
      await wait(0.1); // 100ms
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200); // Allow some tolerance
    });

    it('should call callback after waiting', async () => {
      const callback = vi.fn(() => 'result');
      const result = await wait(0.05, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should work without callback', async () => {
      const result = await wait(0.05);
      expect(result).toBeUndefined();
    });
  });

  describe('MapUtils.set', () => {
    it('should set a key-value pair in a map', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.set(original, 'c', 3);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should overwrite existing key', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.set(original, 'a', 10);

      expect(result).toEqual({ a: 10, b: 2 });
    });

    it('should not mutate original map', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.set(original, 'c', 3);

      expect(original).toEqual({ a: 1, b: 2 });
      expect(result).not.toBe(original);
    });
  });

  describe('MapUtils.update', () => {
    it('should update a value using updater function', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.update(original, 'a', (current) => (current || 0) + 10);

      expect(result).toEqual({ a: 11, b: 2 });
    });

    it('should handle undefined current value', () => {
      const original = { a: 1 };
      const result = MapUtils.update(original, 'b', (current) => current !== undefined ? current : 5);

      expect(result).toEqual({ a: 1, b: 5 });
    });

    it('should not mutate original map', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.update(original, 'a', (current) => (current || 0) * 2);

      expect(original).toEqual({ a: 1, b: 2 });
      expect(result).not.toBe(original);
    });
  });

  describe('MapUtils.setNested', () => {
    it('should set a nested value', () => {
      const original = {
        outer1: { inner1: 'a', inner2: 'b' },
        outer2: { inner3: 'c' }
      };
      const result = MapUtils.setNested(original, 'outer1', 'inner3', 'd');

      expect(result).toEqual({
        outer1: { inner1: 'a', inner2: 'b', inner3: 'd' },
        outer2: { inner3: 'c' }
      });
    });

    it('should create nested map if first key does not exist', () => {
      const original = { outer1: { inner1: 'a' } };
      const result = MapUtils.setNested(original, 'outer2', 'inner2', 'b');

      expect(result).toEqual({
        outer1: { inner1: 'a' },
        outer2: { inner2: 'b' }
      });
    });

    it('should not mutate original nested map', () => {
      const original = { outer1: { inner1: 'a' } };
      const result = MapUtils.setNested(original, 'outer1', 'inner2', 'b');

      expect(original).toEqual({ outer1: { inner1: 'a' } });
      expect(result).not.toBe(original);
      expect(result.outer1).not.toBe(original.outer1);
    });
  });

  describe('MapUtils.updateNested', () => {
    it('should update a nested value using updater function', () => {
      const original = {
        outer1: { inner1: 1, inner2: 2 }
      };
      const result = MapUtils.updateNested(original, 'outer1', 'inner1', (current) => (current || 0) + 10);

      expect(result).toEqual({
        outer1: { inner1: 11, inner2: 2 }
      });
    });

    it('should handle undefined nested value', () => {
      const original = { outer1: { inner1: 1 } };
      const result = MapUtils.updateNested(original, 'outer1', 'inner2', (current) => current !== undefined ? current : 5);

      expect(result).toEqual({
        outer1: { inner1: 1, inner2: 5 }
      });
    });

    it('should handle undefined outer key', () => {
      const original = { outer1: { inner1: 1 } };
      const result = MapUtils.updateNested(original, 'outer2', 'inner1', (current) => current !== undefined ? current : 10);

      expect(result).toEqual({
        outer1: { inner1: 1 },
        outer2: { inner1: 10 }
      });
    });

    it('should not mutate original nested map', () => {
      const original = { outer1: { inner1: 1 } };
      const result = MapUtils.updateNested(original, 'outer1', 'inner1', (current) => (current || 0) * 2);

      expect(original).toEqual({ outer1: { inner1: 1 } });
      expect(result).not.toBe(original);
      expect(result.outer1).not.toBe(original.outer1);
    });
  });

  describe('MapUtils.remove', () => {
    it('should remove a key from map', () => {
      const original = { a: 1, b: 2, c: 3 };
      const result = MapUtils.remove(original, 'b');

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle removing non-existent key', () => {
      const original = { a: 1, b: 2 };
      const result = MapUtils.remove(original, 'c');

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should not mutate original map', () => {
      const original = { a: 1, b: 2, c: 3 };
      const result = MapUtils.remove(original, 'b');

      expect(original).toEqual({ a: 1, b: 2, c: 3 });
      expect(result).not.toBe(original);
    });
  });

  describe('MapUtils.removeNested', () => {
    it('should remove a nested key', () => {
      const original = {
        outer1: { inner1: 'a', inner2: 'b', inner3: 'c' },
        outer2: { inner4: 'd' }
      };
      const result = MapUtils.removeNested(original, 'outer1', 'inner2');

      expect(result).toEqual({
        outer1: { inner1: 'a', inner3: 'c' },
        outer2: { inner4: 'd' }
      });
    });

    it('should handle removing from non-existent outer key', () => {
      const original = { outer1: { inner1: 'a' } };
      const result = MapUtils.removeNested(original, 'outer2', 'inner1');

      expect(result).toEqual({ outer1: { inner1: 'a' } });
      expect(result).toBe(original); // Should return same reference if no change
    });

    it('should handle removing non-existent nested key', () => {
      const original = { outer1: { inner1: 'a' } };
      const result = MapUtils.removeNested(original, 'outer1', 'inner2');

      expect(result).toEqual({ outer1: { inner1: 'a' } });
    });

    it('should not mutate original nested map', () => {
      const original = { outer1: { inner1: 'a', inner2: 'b' } };
      const result = MapUtils.removeNested(original, 'outer1', 'inner2');

      expect(original).toEqual({ outer1: { inner1: 'a', inner2: 'b' } });
      expect(result).not.toBe(original);
      expect(result.outer1).not.toBe(original.outer1);
    });
  });

  describe('MapUtils.merge', () => {
    it('should merge multiple maps', () => {
      const map1 = { a: 1, b: 2 };
      const map2 = { c: 3, d: 4 };
      const map3 = { e: 5 };
      const result = MapUtils.merge(map1, map2, map3);

      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    });

    it('should overwrite values from later maps', () => {
      const map1 = { a: 1, b: 2 };
      const map2 = { b: 20, c: 3 };
      const result = MapUtils.merge(map1, map2);

      expect(result).toEqual({ a: 1, b: 20, c: 3 });
    });

    it('should handle empty maps', () => {
      const map1 = { a: 1 };
      const result = MapUtils.merge(map1, {}, {});

      expect(result).toEqual({ a: 1 });
    });

    it('should not mutate original maps', () => {
      const map1 = { a: 1 };
      const map2 = { b: 2 };
      const result = MapUtils.merge(map1, map2);

      expect(map1).toEqual({ a: 1 });
      expect(map2).toEqual({ b: 2 });
      expect(result).not.toBe(map1);
      expect(result).not.toBe(map2);
    });
  });
});
