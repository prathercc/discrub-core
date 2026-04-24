import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelProviderAdapter } from './channel-provider-adapter.ts';
import { NotificationManagerAdapter } from './notification-manager-adapter.ts';
import { ModificationProgressManagerAdapter } from './modification-progress-manager-adapter.ts';
import { ThreadManagerAdapter } from './thread-manager-adapter.ts';
import { ThreadProviderAdapter } from './thread-provider-adapter.ts';
import { DiscordServiceAdapter } from './discord-service-adapter.ts';
import type { Channel } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';

// Mock DiscordService
vi.mock('../../services/discord-service.ts', () => ({
  DiscordService: vi.fn().mockImplementation(() => ({
    fetchMessageData: vi.fn(),
    fetchSearchMessageData: vi.fn(),
    getReactions: vi.fn(),
    getUser: vi.fn(),
    fetchGuildUser: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    deleteReaction: vi.fn(),
  })),
}));

describe('Message Adapters', () => {
  describe('ChannelProviderAdapter', () => {
    it('should find channel by id from channels array', () => {
      const channels: Channel[] = [
        { id: 'channel-1', name: 'General' } as Channel,
        { id: 'channel-2', name: 'Random' } as Channel,
      ];
      const adapter = new ChannelProviderAdapter(channels, []);

      const result = adapter.findChannel('channel-1');

      expect(result).toEqual({ id: 'channel-1', name: 'General' });
    });

    it('should find channel by id from dms array', () => {
      const dms: Channel[] = [
        { id: 'dm-1', name: 'DM 1' } as Channel,
        { id: 'dm-2', name: 'DM 2' } as Channel,
      ];
      const adapter = new ChannelProviderAdapter([], dms);

      const result = adapter.findChannel('dm-1');

      expect(result).toEqual({ id: 'dm-1', name: 'DM 1' });
    });

    it('should return undefined for non-existent channel', () => {
      const adapter = new ChannelProviderAdapter([], []);

      const result = adapter.findChannel('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should get all channels', () => {
      const channels: Channel[] = [
        { id: 'channel-1', name: 'General' } as Channel,
      ];
      const adapter = new ChannelProviderAdapter(channels, []);

      const result = adapter.getChannels();

      expect(result).toEqual(channels);
    });

    it('should get all DMs', () => {
      const dms: Channel[] = [
        { id: 'dm-1', name: 'DM 1' } as Channel,
      ];
      const adapter = new ChannelProviderAdapter([], dms);

      const result = adapter.getDMs();

      expect(result).toEqual(dms);
    });

    it('should create from Redux state', () => {
      const state = {
        channel: {
          channels: [{ id: 'channel-1' } as Channel],
        },
        dm: {
          dms: [{ id: 'dm-1' } as Channel],
        },
      };

      const adapter = ChannelProviderAdapter.fromReduxState(state);

      expect(adapter.getChannels()).toEqual(state.channel.channels);
      expect(adapter.getDMs()).toEqual(state.dm.dms);
    });
  });

  describe('NotificationManagerAdapter', () => {
    it('should call notify function', async () => {
      const notifyFn = vi.fn().mockResolvedValue(undefined);
      const adapter = new NotificationManagerAdapter(notifyFn);

      await adapter.notify('Test message', 5000);

      expect(notifyFn).toHaveBeenCalledWith('Test message', 5000);
      expect(notifyFn).toHaveBeenCalledTimes(1);
    });

    it('should create from Redux dispatch', async () => {
      const dispatchFn = vi.fn().mockResolvedValue(undefined);
      const adapter = NotificationManagerAdapter.fromReduxDispatch(dispatchFn);

      await adapter.notify('Test message', 3000);

      expect(dispatchFn).toHaveBeenCalledWith({
        message: 'Test message',
        timeout: 3000,
      });
    });

    it('should handle async notify', async () => {
      const notifyFn = vi.fn().mockImplementation(async (msg, timeout) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const adapter = new NotificationManagerAdapter(notifyFn);

      await adapter.notify('Async message', 2000);

      expect(notifyFn).toHaveBeenCalled();
    });
  });

  describe('ModificationProgressManagerAdapter', () => {
    it('should call setIsModifying function', () => {
      const setIsModifyingFn = vi.fn();
      const setModifyEntityFn = vi.fn();
      const adapter = new ModificationProgressManagerAdapter(
        setIsModifyingFn,
        setModifyEntityFn
      );

      adapter.setIsModifying(true);

      expect(setIsModifyingFn).toHaveBeenCalledWith(true);
      expect(setIsModifyingFn).toHaveBeenCalledTimes(1);
    });

    it('should call setModifyEntity function', () => {
      const setIsModifyingFn = vi.fn();
      const setModifyEntityFn = vi.fn();
      const adapter = new ModificationProgressManagerAdapter(
        setIsModifyingFn,
        setModifyEntityFn
      );

      const entity = { id: '123', type: 'message' };
      adapter.setModifyEntity(entity);

      expect(setModifyEntityFn).toHaveBeenCalledWith(entity);
      expect(setModifyEntityFn).toHaveBeenCalledTimes(1);
    });

    it('should create from Redux dispatch', () => {
      const setIsModifyingDispatch = vi.fn();
      const setModifyEntityDispatch = vi.fn();

      const adapter = ModificationProgressManagerAdapter.fromReduxDispatch(
        setIsModifyingDispatch,
        setModifyEntityDispatch
      );

      adapter.setIsModifying(false);
      adapter.setModifyEntity({ id: '456' });

      expect(setIsModifyingDispatch).toHaveBeenCalledWith(false);
      expect(setModifyEntityDispatch).toHaveBeenCalledWith({ id: '456' });
    });

    it('should handle multiple calls', () => {
      const setIsModifyingFn = vi.fn();
      const setModifyEntityFn = vi.fn();
      const adapter = new ModificationProgressManagerAdapter(
        setIsModifyingFn,
        setModifyEntityFn
      );

      adapter.setIsModifying(true);
      adapter.setIsModifying(false);
      adapter.setModifyEntity({ id: '1' });
      adapter.setModifyEntity({ id: '2' });

      expect(setIsModifyingFn).toHaveBeenCalledTimes(2);
      expect(setModifyEntityFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('ThreadManagerAdapter', () => {
    it('should call liftThreadRestrictions function', async () => {
      const liftRestrictionsFn = vi.fn().mockResolvedValue(['thread-1', 'thread-2']);
      const adapter = new ThreadManagerAdapter(liftRestrictionsFn);

      const result = await adapter.liftThreadRestrictions('channel-1', ['known-1']);

      expect(liftRestrictionsFn).toHaveBeenCalledWith('channel-1', ['known-1']);
      expect(result).toEqual(['thread-1', 'thread-2']);
    });

    it('should create from Redux dispatch', async () => {
      const dispatchFn = vi.fn().mockResolvedValue(['thread-3']);
      const adapter = ThreadManagerAdapter.fromReduxDispatch(dispatchFn);

      const result = await adapter.liftThreadRestrictions('channel-2', []);

      expect(dispatchFn).toHaveBeenCalledWith('channel-2', []);
      expect(result).toEqual(['thread-3']);
    });

    it('should handle empty known permission ids', async () => {
      const liftRestrictionsFn = vi.fn().mockResolvedValue([]);
      const adapter = new ThreadManagerAdapter(liftRestrictionsFn);

      const result = await adapter.liftThreadRestrictions('channel-1', []);

      expect(result).toEqual([]);
    });

    it('should handle async operations', async () => {
      const liftRestrictionsFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return ['thread-1'];
      });
      const adapter = new ThreadManagerAdapter(liftRestrictionsFn);

      const result = await adapter.liftThreadRestrictions('channel-1', []);

      expect(result).toEqual(['thread-1']);
    });
  });

  describe('ThreadProviderAdapter', () => {
    it('should fetch archived threads', async () => {
      const fetchThreadsFn = vi.fn().mockResolvedValue([
        { id: 'thread-1', name: 'Thread 1' } as Channel,
      ]);
      const adapter = new ThreadProviderAdapter(fetchThreadsFn);

      const result = await adapter.fetchArchivedThreads('channel-1', []);

      expect(fetchThreadsFn).toHaveBeenCalledWith('channel-1', []);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('thread-1');
    });

    it('should pass known threads to fetch function', async () => {
      const fetchThreadsFn = vi.fn().mockResolvedValue([]);
      const adapter = new ThreadProviderAdapter(fetchThreadsFn);
      const knownThreads = [
        { id: 'thread-1' } as Channel,
      ];

      await adapter.fetchArchivedThreads('channel-1', knownThreads);

      expect(fetchThreadsFn).toHaveBeenCalledWith('channel-1', knownThreads);
    });

    it('should create from Redux dispatch', async () => {
      const dispatchFn = vi.fn().mockResolvedValue([
        { id: 'thread-2', name: 'Thread 2' } as Channel,
      ]);
      const adapter = ThreadProviderAdapter.fromReduxDispatch(dispatchFn);

      const result = await adapter.fetchArchivedThreads('channel-2', []);

      expect(dispatchFn).toHaveBeenCalledWith({
        channelId: 'channel-2',
        knownThreads: [],
      });
      expect(result[0].id).toBe('thread-2');
    });

    it('should handle empty thread results', async () => {
      const fetchThreadsFn = vi.fn().mockResolvedValue([]);
      const adapter = new ThreadProviderAdapter(fetchThreadsFn);

      const result = await adapter.fetchArchivedThreads('channel-1', []);

      expect(result).toEqual([]);
    });
  });

  describe('DiscordServiceAdapter', () => {
    let adapter: DiscordServiceAdapter;
    let mockService: any;

    beforeEach(() => {
      vi.clearAllMocks();
      const settings: AppSettings = {} as AppSettings;
      adapter = new DiscordServiceAdapter(settings);
      mockService = (adapter as any).service;
    });

    it('should fetch message data', async () => {
      mockService.fetchMessageData.mockResolvedValue({
        success: true,
        data: [{ id: 'msg-1' }],
      });

      const result = await adapter.fetchMessageData('token', 'last-id', 'channel-1');

      expect(mockService.fetchMessageData).toHaveBeenCalledWith(
        'token',
        'last-id',
        'channel-1',
        undefined
      );
      expect(result.success).toBe(true);
    });

    it('should fetch message data with around parameter', async () => {
      mockService.fetchMessageData.mockResolvedValue({
        success: true,
        data: [],
      });

      await adapter.fetchMessageData('token', 'last-id', 'channel-1', 'around');

      expect(mockService.fetchMessageData).toHaveBeenCalledWith(
        'token',
        'last-id',
        'channel-1',
        'around'
      );
    });

    it('should fetch search message data and transform result', async () => {
      mockService.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 10,
          messages: [{ id: 'msg-1' }],
          threads: [],
        },
      });

      const result = await adapter.fetchSearchMessageData(
        'token',
        0,
        'channel-1',
        'guild-1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data?.messages).toEqual([[{ id: 'msg-1' }]]);
      expect(result.data?.total_results).toBe(10);
    });

    it('should handle search failure', async () => {
      mockService.fetchSearchMessageData.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await adapter.fetchSearchMessageData(
        'token',
        0,
        null,
        null,
        {}
      );

      expect(result.success).toBe(false);
    });

    it('should get reactions with normal type', async () => {
      mockService.getReactions.mockResolvedValue({
        success: true,
        data: [{ id: 'user-1' }],
      });

      const result = await adapter.getReactions(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        0,
        null
      );

      expect(mockService.getReactions).toHaveBeenCalledWith(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        0,
        null
      );
      expect(result.success).toBe(true);
    });

    it('should get reactions with burst type', async () => {
      mockService.getReactions.mockResolvedValue({
        success: true,
        data: [],
      });

      await adapter.getReactions(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        1,
        'last-id'
      );

      expect(mockService.getReactions).toHaveBeenCalledWith(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        1,
        'last-id'
      );
    });

    it('should get user', async () => {
      mockService.getUser.mockResolvedValue({
        success: true,
        data: { id: 'user-1', username: 'test' },
      });

      const result = await adapter.getUser('token', 'user-1');

      expect(mockService.getUser).toHaveBeenCalledWith('token', 'user-1');
      expect(result.data?.username).toBe('test');
    });

    it('should fetch guild user', async () => {
      mockService.fetchGuildUser.mockResolvedValue({
        success: true,
        data: { user: { id: 'user-1' }, nick: 'Nickname' },
      });

      const result = await adapter.fetchGuildUser('guild-1', 'user-1', 'token');

      expect(mockService.fetchGuildUser).toHaveBeenCalledWith(
        'guild-1',
        'user-1',
        'token'
      );
      expect(result.data?.nick).toBe('Nickname');
    });

    it('should edit message', async () => {
      mockService.editMessage.mockResolvedValue({
        success: true,
        data: { id: 'msg-1', content: 'Updated' },
      });

      const result = await adapter.editMessage(
        'token',
        'msg-1',
        { content: 'Updated' },
        'channel-1'
      );

      expect(mockService.editMessage).toHaveBeenCalledWith(
        'token',
        'msg-1',
        { content: 'Updated' },
        'channel-1'
      );
      expect(result.data?.content).toBe('Updated');
    });

    it('should delete message', async () => {
      mockService.deleteMessage.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await adapter.deleteMessage('token', 'msg-1', 'channel-1');

      expect(mockService.deleteMessage).toHaveBeenCalledWith(
        'token',
        'msg-1',
        'channel-1'
      );
      expect(result.success).toBe(true);
    });

    it('should delete reaction', async () => {
      mockService.deleteReaction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await adapter.deleteReaction(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        'user-1'
      );

      expect(mockService.deleteReaction).toHaveBeenCalledWith(
        'token',
        'channel-1',
        'msg-1',
        'emoji',
        'user-1'
      );
      expect(result.success).toBe(true);
    });
  });
});
