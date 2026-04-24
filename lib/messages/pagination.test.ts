import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaginationHelper } from './pagination.ts';
import type { APIResponse } from './types.ts';

describe('PaginationHelper', () => {
  type TestItem = { id: string; data: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cursor-Based Pagination', () => {
    it('should fetch multiple batches until completion', async () => {
      const batch1: TestItem[] = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
      ];
      const batch2: TestItem[] = [
        { id: '3', data: 'item3' },
        { id: '4', data: 'item4' },
      ];
      const batch3: TestItem[] = [
        { id: '5', data: 'item5' },
      ];

      let callCount = 0;
      const fetchFn = vi.fn(async (lastId: string | null): Promise<APIResponse<TestItem[]>> => {
        callCount++;
        if (callCount === 1) {
          expect(lastId).toBeNull();
          return { success: true, data: batch1 };
        } else if (callCount === 2) {
          expect(lastId).toBe('2');
          return { success: true, data: batch2 };
        } else {
          expect(lastId).toBe('4');
          return { success: true, data: batch3 };
        }
      });

      const helper = new PaginationHelper({ pageSize: 2 });
      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(5);
      expect(result).toEqual([...batch1, ...batch2, ...batch3]);
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('should handle single batch completion', async () => {
      const batch: TestItem[] = [
        { id: '1', data: 'item1' },
      ];

      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        return { success: true, data: batch };
      });

      const helper = new PaginationHelper({ pageSize: 100 });
      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(1);
      expect(result).toEqual(batch);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        return { success: true, data: [] };
      });

      const helper = new PaginationHelper({ pageSize: 100 });
      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(0);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancellation Handling', () => {
    it('should stop when shouldStop becomes true after a batch', async () => {
      const batch1: TestItem[] = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
      ];

      let stopped = false;
      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        stopped = true;
        return { success: true, data: batch1 };
      });

      const helper = new PaginationHelper({
        pageSize: 2,
        shouldStop: async () => stopped,
      });

      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(2);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should stop on shouldStop callback', async () => {
      const batch1: TestItem[] = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
      ];

      let shouldStop = false;
      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        shouldStop = true;
        return { success: true, data: batch1 };
      });

      const helper = new PaginationHelper({
        pageSize: 2,
        shouldStop: async () => shouldStop,
      });

      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(2);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        return { success: false };
      });

      const helper = new PaginationHelper({ pageSize: 100 });
      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(0);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Processing', () => {
    it('should call batch processor for each batch', async () => {
      const batch1: TestItem[] = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
      ];
      const batch2: TestItem[] = [
        { id: '3', data: 'item3' },
      ];

      let callCount = 0;
      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        callCount++;
        return callCount === 1
          ? { success: true, data: batch1 }
          : { success: true, data: batch2 };
      });

      const onBatch = vi.fn();
      const helper = new PaginationHelper({ pageSize: 2 });
      await helper.paginatedFetch(fetchFn, onBatch);

      expect(onBatch).toHaveBeenCalledTimes(2);
      expect(onBatch).toHaveBeenNthCalledWith(1, batch1);
      expect(onBatch).toHaveBeenNthCalledWith(2, batch2);
    });

    it('should support async batch processor', async () => {
      const batch: TestItem[] = [{ id: '1', data: 'item1' }];

      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        return { success: true, data: batch };
      });

      const onBatch = vi.fn(async (items: TestItem[]) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return;
      });

      const helper = new PaginationHelper({ pageSize: 100 });
      await helper.paginatedFetch(fetchFn, onBatch);

      expect(onBatch).toHaveBeenCalledWith(batch);
    });
  });

  describe('Configuration', () => {
    it('should use custom page size', async () => {
      const batch: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        data: `item${i + 1}`,
      }));

      const fetchFn = vi.fn(async (): Promise<APIResponse<TestItem[]>> => {
        return { success: true, data: batch };
      });

      const helper = new PaginationHelper({ pageSize: 50 });
      const result = await helper.paginatedFetch(fetchFn);

      expect(result).toHaveLength(10);
      expect(fetchFn).toHaveBeenCalledTimes(1); // Less than pageSize, so it stops
    });
  });
});
