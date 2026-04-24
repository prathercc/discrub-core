import type {
  APIResponse,
  ShouldStopCallback,
} from "./types.ts";

interface PaginationConfig {
  shouldStop?: ShouldStopCallback;
  pageSize?: number;
}

export class PaginationHelper {
  private pageSize: number;
  private shouldStopFn?: ShouldStopCallback;

  constructor(config: PaginationConfig) {
    this.pageSize = config.pageSize || 100;
    this.shouldStopFn = config.shouldStop;
  }

  /**
   * Generic pagination helper for Discord API endpoints
   * Fetches all pages until no more results
   */
  async paginatedFetch<T extends { id: string }>(
    fetchFn: (lastId: string | null) => Promise<APIResponse<T[]>>,
    onBatch?: (batch: T[]) => void | Promise<void>,
  ): Promise<T[]> {
    const allResults: T[] = [];
    let lastId: string | null = null;
    let reachedEnd = false;

    while (!reachedEnd) {
      if (await this.shouldStop()) break;

      const { success, data } = await fetchFn(lastId);

      if (success && data && data.length > 0) {
        allResults.push(...data);
        lastId = data[data.length - 1].id;

        // Call batch processor if provided
        if (onBatch) {
          await onBatch(data);
        }

        // Check if we've reached the end
        if (data.length < this.pageSize) {
          reachedEnd = true;
        }
      } else {
        reachedEnd = true;
      }
    }

    return allResults;
  }

  private async shouldStop(): Promise<boolean> {
    if (this.shouldStopFn) return await this.shouldStopFn();
    return false;
  }
}