import type { IThreadManager } from "../types.ts";

/**
 * Adapter to provide thread management functionality
 */
export class ThreadManagerAdapter implements IThreadManager {
  private liftRestrictionsFn: (
    channelId: string,
    knownNoPermissionIds: string[],
  ) => Promise<string[]>;

  constructor(
    liftRestrictionsFn: (
      channelId: string,
      knownNoPermissionIds: string[],
    ) => Promise<string[]>,
  ) {
    this.liftRestrictionsFn = liftRestrictionsFn;
  }

  async liftThreadRestrictions(
    channelId: string,
    knownNoPermissionIds: string[],
  ): Promise<string[]> {
    return await this.liftRestrictionsFn(channelId, knownNoPermissionIds);
  }

  /**
   * Create adapter from Redux dispatch function
   */
  static fromReduxDispatch(
    dispatchFn: (
      channelId: string,
      knownNoPermissionIds: string[],
    ) => Promise<string[]>,
  ): ThreadManagerAdapter {
    return new ThreadManagerAdapter(dispatchFn);
  }
}
