import type { IChannelProvider } from "../types.ts";
import type { Channel } from "../../types/discord-types.ts";

/**
 * Adapter for channel data provider
 * Allows passing channel/DM arrays to the service
 */
export class ChannelProviderAdapter implements IChannelProvider {
  constructor(
    private channels: Channel[],
    private dms: Channel[],
  ) {}

  findChannel(channelId: string): Channel | undefined {
    return [...this.channels, ...this.dms].find((c) => c.id === channelId);
  }

  getChannels(): Channel[] {
    return this.channels;
  }

  getDMs(): Channel[] {
    return this.dms;
  }

  /**
   * Create from Redux state
   */
  static fromReduxState(state: {
    channel: { channels: Channel[] };
    dm: { dms: Channel[] };
  }): ChannelProviderAdapter {
    return new ChannelProviderAdapter(state.channel.channels, state.dm.dms);
  }
}