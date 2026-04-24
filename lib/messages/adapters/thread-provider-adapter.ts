import type { IThreadProvider } from "../types.ts";
import type { Channel } from "../../types/discord-types.ts";

/**
 * Adapter for thread fetching
 * Allows passing a thread fetching function to the service
 */
export class ThreadProviderAdapter implements IThreadProvider {
  constructor(
    private fetchThreadsFn: (
      channelId: string,
      knownThreads: Channel[],
    ) => Promise<Channel[]>,
  ) {}

  async fetchArchivedThreads(
    channelId: string,
    knownThreads: Channel[],
  ): Promise<Channel[]> {
    return this.fetchThreadsFn(channelId, knownThreads);
  }

  /**
   * Create from Redux dispatch
   * Accepts a function that dispatches the getArchivedThreads thunk
   */
  static fromReduxDispatch(
    dispatchFn: (params: {
      channelId: string;
      knownThreads: Channel[];
    }) => Promise<Channel[]>,
  ): ThreadProviderAdapter {
    return new ThreadProviderAdapter((channelId, knownThreads) =>
      dispatchFn({ channelId, knownThreads }),
    );
  }
}