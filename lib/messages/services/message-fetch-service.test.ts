import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageFetchService } from './message-fetch-service.ts';
import { PaginationHelper } from '../pagination.ts';
import type { MessageFetchConfig, MessageRetrievalOptions } from '../types.ts';
import type { Message, Channel } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';
import * as utils from '../utils.ts';

describe('MessageFetchService', () => {
  let service: MessageFetchService;
  let mockConfig: MessageFetchConfig;
  let mockApiClient: any;
  let mockChannelProvider: any;
  let mockThreadProvider: any;

  const createMsg = (id: string, channelId: string, type: number = 0): Message => ({
    id,
    channel_id: channelId,
    content: `Message ${id}`,
    timestamp: new Date().toISOString(),
    type,
    author: {
      id: 'user-1',
      username: 'testuser',
      discriminator: '0001',
    },
  } as Message);

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      fetchMessageData: vi.fn(),
      fetchSearchMessageData: vi.fn(),
    };

    mockChannelProvider = {
      findChannel: vi.fn(),
    };

    mockThreadProvider = {
      fetchArchivedThreads: vi.fn(),
    };

    const mockSettings: AppSettings = {
      reactionsEnabled: true,
      purgeReactionRemovalFrom: null,
    } as AppSettings;

    mockConfig = {
      discordAdapter: {} as any,
      settings: mockSettings,
      apiClient: mockApiClient,
      channelProvider: mockChannelProvider,
      threadProvider: mockThreadProvider,
      token: 'test-token',
      existingUserMap: {},
      existingReactionMap: {},
    };

    service = new MessageFetchService(mockConfig);
  });

  describe('Pagination Strategy', () => {
    it('should fetch messages using pagination helper', async () => {
      const mockMessages = [
        createMsg('1', 'channel-1'),
        createMsg('2', 'channel-1'),
        createMsg('3', 'channel-1'),
      ];

      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      // Mock PaginationHelper.paginatedFetch
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue(mockMessages);

      // Mock utility function
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([]);

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([]);

      const result = await service.fetchMessages(null, 'channel-1');

      expect(result.messages).toEqual(mockMessages);
      expect(PaginationHelper.prototype.paginatedFetch).toHaveBeenCalled();
    });

    it('should filter messages by allowed types', async () => {
      const mockMessages = [
        createMsg('1', 'channel-1', 0),  // Regular message
        createMsg('2', 'channel-1', 19), // Reply
        createMsg('3', 'channel-1', 21), // Auto-mod
      ];

      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue(mockMessages);

      // Mock filtering: only allow type 0 and 19
      vi.spyOn(utils, 'isMessageTypeAllowed').mockImplementation((type) => type === 0 || type === 19);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([]);

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([]);

      const result = await service.fetchMessages(null, 'channel-1');

      expect(result.messages).toHaveLength(2);
      expect(result.messages.map(m => m.type)).toEqual([0, 19]);
    });

    it('should emit progress callbacks during pagination', async () => {
      const mockMessages = [createMsg('1', 'channel-1')];
      const onStatus = vi.fn();

      mockConfig.onStatus = onStatus;
      service = new MessageFetchService(mockConfig);

      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      // Mock paginatedFetch to call the onBatch callback
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async (fetcher, onBatch) => {
        if (onBatch) {
          onBatch(mockMessages);
        }
        return mockMessages;
      });

      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([]);

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([]);

      await service.fetchMessages(null, 'channel-1');

      expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('Retrieved'));
    });
  });

  describe('Thread Extraction', () => {
    it('should extract and fetch messages from threads', async () => {
      const mainMessages = [createMsg('1', 'channel-1')];
      const threadMessages = [createMsg('2', 'thread-1')];

      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      const mockThread: Channel = {
        id: 'thread-1',
        type: 11,
        name: 'Test Thread',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      // Mock pagination calls
      let callCount = 0;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? mainMessages : threadMessages;
      });

      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([mockThread]);
      vi.spyOn(utils, 'getThreadEntityName').mockReturnValue('Test Thread');

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([]);

      const result = await service.fetchMessages(null, 'channel-1');

      expect(result.messages).toHaveLength(2);
      expect(result.threads).toContain(mockThread);
      expect(PaginationHelper.prototype.paginatedFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress events during message fetch', async () => {
      const onProgress = vi.fn();
      mockConfig.onProgress = onProgress;
      service = new MessageFetchService(mockConfig);

      const mockMessages = [createMsg('1', 'channel-1')];

      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 1,
          messages: [mockMessages],
          threads: [],
        },
      });

      // Mock fetchMessageData for reaction resolution
      mockApiClient.fetchMessageData.mockResolvedValue({
        success: true,
        data: [{ ...mockMessages[0], reactions: [] }],
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'getNextSearchData').mockReturnValue({
        offset: 1,
        isEndConditionMet: true,
        searchCriteria: {},
      });
      vi.spyOn(utils, 'getNextSearchStatus').mockReturnValue('Complete');

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
      };

      await service.fetchMessages('guild-1', 'channel-1', options);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'fetching_messages',
          current: 1,
          total: 1,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should return empty result when channel not found', async () => {
      mockChannelProvider.findChannel.mockReturnValue(null);

      const result = await service.fetchMessages(null, 'unknown-channel');

      expect(result.messages).toEqual([]);
      expect(result.threads).toEqual([]);
    });

    it('should skip thread fetching for DM channels', async () => {
      const mockMessages = [createMsg('1', 'dm-channel')];
      const dmChannel: Channel = {
        id: 'dm-channel',
        type: 1, // DM type
        name: 'DM',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(dmChannel);
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue(mockMessages);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(true);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);

      const result = await service.fetchMessages(null, 'dm-channel');

      expect(result.messages).toEqual(mockMessages);
      expect(result.threads).toEqual([]);
      expect(mockThreadProvider.fetchArchivedThreads).not.toHaveBeenCalled();
    });

    it('should handle forum channels', async () => {
      const forumChannel: Channel = {
        id: 'forum-1',
        type: 15, // Forum type
        name: 'Forum Channel',
        guild_id: 'guild-1',
      } as Channel;

      const mockThread: Channel = {
        id: 'thread-1',
        type: 11,
        name: 'Forum Thread',
      } as Channel;

      const mockForumMessage = createMsg('1', 'thread-1');

      mockChannelProvider.findChannel.mockReturnValue(forumChannel);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(true);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'getNextSearchData').mockReturnValue({
        offset: 1,
        isEndConditionMet: true,
        searchCriteria: {},
      });
      vi.spyOn(utils, 'getNextSearchStatus').mockReturnValue('Complete');

      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 1,
          messages: [[mockForumMessage]],
          threads: [mockThread],
        },
      });

      // Mock reaction resolution
      mockApiClient.fetchMessageData.mockResolvedValue({
        success: true,
        data: [{ ...mockForumMessage, reactions: [] }],
      });

      const result = await service.fetchMessages(null, 'forum-1');

      expect(result.threads).toContain(mockThread);
      expect(mockApiClient.fetchSearchMessageData).toHaveBeenCalled();
    });

    it('should handle messages without content or attachments', async () => {
      const messagesWithoutContent = [
        { ...createMsg('1', 'channel-1'), content: '', attachments: undefined },
        { ...createMsg('2', 'channel-1'), content: 'Valid', attachments: [] },
      ];

      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      let batchCallback: ((batch: Message[]) => void) | undefined;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(
        async (fetcher, onBatch) => {
          batchCallback = onBatch;
          if (batchCallback) {
            batchCallback([messagesWithoutContent[0]]);
            batchCallback([messagesWithoutContent[1]]);
          }
          return messagesWithoutContent;
        },
      );

      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([]);

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([]);

      const result = await service.fetchMessages(null, 'channel-1');

      expect(result.messages).toEqual(messagesWithoutContent);
    });

    it('should fetch archived threads', async () => {
      const mockMessages = [createMsg('1', 'channel-1')];
      const mockChannel: Channel = {
        id: 'channel-1',
        type: 0,
        name: 'Test Channel',
      } as Channel;

      const archivedThread: Channel = {
        id: 'archived-thread',
        type: 11,
        name: 'Archived Thread',
      } as Channel;

      mockChannelProvider.findChannel.mockReturnValue(mockChannel);

      let callCount = 0;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? mockMessages : [];
      });

      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'isDm').mockReturnValue(false);
      vi.spyOn(utils, 'isGuildForum').mockReturnValue(false);
      vi.spyOn(utils, 'getThreadsFromMessages').mockReturnValue([]);
      vi.spyOn(utils, 'getThreadEntityName').mockReturnValue('Archived Thread');

      mockThreadProvider.fetchArchivedThreads.mockResolvedValue([archivedThread]);

      const result = await service.fetchMessages(null, 'channel-1');

      expect(mockThreadProvider.fetchArchivedThreads).toHaveBeenCalled();
      expect(result.threads).toContain(archivedThread);
      expect(PaginationHelper.prototype.paginatedFetch).toHaveBeenCalledTimes(2); // Main + archived thread
    });
  });

  describe('Reaction Resolution', () => {
    it('should emit status updates during reaction resolution', async () => {
      const onStatus = vi.fn();
      mockConfig.onStatus = onStatus;
      service = new MessageFetchService(mockConfig);

      const mockMessages = [createMsg('1', 'channel-1'), createMsg('2', 'channel-1')];

      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 2,
          messages: [mockMessages],
          threads: [],
        },
      });

      // Mock fetchMessageData to return different data for each call
      let fetchCallCount = 0;
      mockApiClient.fetchMessageData.mockImplementation(async () => {
        fetchCallCount++;
        const msgIndex = fetchCallCount - 1;
        return {
          success: true,
          data: [{ ...mockMessages[msgIndex], reactions: [] }],
        };
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'getNextSearchData').mockReturnValue({
        offset: 2,
        isEndConditionMet: true,
        searchCriteria: {},
      });
      vi.spyOn(utils, 'getNextSearchStatus').mockReturnValue('Complete');

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
      };

      await service.fetchMessages('guild-1', 'channel-1', options);

      expect(onStatus).toHaveBeenCalledWith('Searching reactions (1/2)');
      expect(onStatus).toHaveBeenCalledWith('Searching reactions (2/2)');
    });

    it('should skip reaction resolution when excludeReactions is true', async () => {
      const mockMessages = [createMsg('1', 'channel-1')];

      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 1,
          messages: [mockMessages],
          threads: [],
        },
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'getNextSearchData').mockReturnValue({
        offset: 1,
        isEndConditionMet: true,
        searchCriteria: {},
      });
      vi.spyOn(utils, 'getNextSearchStatus').mockReturnValue('Complete');

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
        excludeReactions: true,
      };

      await service.fetchMessages('guild-1', 'channel-1', options);

      expect(mockApiClient.fetchMessageData).not.toHaveBeenCalled();
    });

    it('should handle early termination during reaction resolution', async () => {
      const mockMessages = [createMsg('1', 'channel-1'), createMsg('2', 'channel-1')];

      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 2,
          messages: [mockMessages],
          threads: [],
        },
      });

      let callCount = 0;
      mockConfig.shouldStop = vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount > 1; // Stop after first message
      });
      service = new MessageFetchService(mockConfig);

      mockApiClient.fetchMessageData.mockResolvedValue({
        success: true,
        data: [{ ...mockMessages[0], reactions: [] }],
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);
      vi.spyOn(utils, 'isMessageTypeAllowed').mockReturnValue(true);
      vi.spyOn(utils, 'getNextSearchData').mockReturnValue({
        offset: 2,
        isEndConditionMet: true,
        searchCriteria: {},
      });
      vi.spyOn(utils, 'getNextSearchStatus').mockReturnValue('Complete');

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
      };

      await service.fetchMessages('guild-1', 'channel-1', options);

      // Should have stopped during reaction resolution
      expect(mockConfig.shouldStop).toHaveBeenCalled();
    });
  });

  describe('Search API Failure', () => {
    it('should handle API failure gracefully', async () => {
      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: false,
        data: null,
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
      };

      const result = await service.fetchMessages('guild-1', 'channel-1', options);

      expect(result.messages).toEqual([]);
    });

    it('should handle empty search results', async () => {
      mockApiClient.fetchSearchMessageData.mockResolvedValue({
        success: true,
        data: {
          total_results: 0,
          messages: [],
          threads: [],
        },
      });

      vi.spyOn(utils, 'isCriteriaActive').mockReturnValue(true);

      const options: MessageRetrievalOptions = {
        searchCriteria: { has: 'link' },
      };

      const result = await service.fetchMessages('guild-1', 'channel-1', options);

      expect(result.messages).toEqual([]);
      expect(result.threads).toEqual([]);
    });
  });
});
