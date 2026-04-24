import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactionEnrichmentService } from './reaction-enrichment-service.ts';
import { PaginationHelper } from '../pagination.ts';
import type { ReactionEnrichmentConfig } from '../types.ts';
import type { Message, User } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';
import * as utils from '../utils.ts';

describe('ReactionEnrichmentService', () => {
  let service: ReactionEnrichmentService;
  let mockConfig: ReactionEnrichmentConfig;
  let mockApiClient: any;

  const createMsg = (id: string, hasReactions: boolean = false): Message => {
    const msg: Message = {
      id,
      channel_id: 'channel-1',
      content: `Message ${id}`,
      timestamp: new Date().toISOString(),
      author: {
        id: 'user-1',
        username: 'testuser',
        discriminator: '0001',
      },
    } as Message;

    if (hasReactions) {
      msg.reactions = [
        {
          emoji: { name: '👍', id: null },
          count: 2,
          count_details: { normal: 2, burst: 0 },
        },
      ];
    }

    return msg;
  };

  const createUser = (id: string): User => ({
    id,
    username: `user${id}`,
    discriminator: '0001',
  } as User);

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      getReactions: vi.fn(),
    };

    const mockSettings: AppSettings = {
      reactionsEnabled: true,
    } as AppSettings;

    mockConfig = {
      apiClient: mockApiClient,
      token: 'test-token',
      settings: mockSettings,
    };

    service = new ReactionEnrichmentService(mockConfig);
  });

  describe('Reaction Collection', () => {
    it('should collect reactions from messages', async () => {
      const messages = [
        createMsg('msg1', true),
        createMsg('msg2', false),
        createMsg('msg3', true),
      ];

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([
        createUser('user1'),
      ]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap).toBeDefined();
      expect(Object.keys(result.reactionMap)).toHaveLength(2); // msg1 and msg3
      expect(result.reactionMap['msg1']).toBeDefined();
      expect(result.reactionMap['msg3']).toBeDefined();
      expect(result.reactionMap['msg2']).toBeUndefined();
    });

    it('should build reaction map correctly', async () => {
      const messages = [createMsg('msg1', true)];

      const mockUsers = [createUser('user1'), createUser('user2')];

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue(mockUsers);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']['👍']).toBeDefined();
      expect(result.reactionMap['msg1']['👍']).toHaveLength(2); // 2 users (normal only, burst count is 0)
      expect(result.reactionMap['msg1']['👍'][0]).toHaveProperty('id');
      expect(result.reactionMap['msg1']['👍'][0]).toHaveProperty('burst');
    });
  });

  describe('Reaction User Fetching', () => {
    it('should fetch reaction users with pagination', async () => {
      const messages = [createMsg('msg1', true)];
      const mockUsers = [createUser('user1'), createUser('user2')];

      const paginatedFetchSpy = vi
        .spyOn(PaginationHelper.prototype, 'paginatedFetch')
        .mockResolvedValue(mockUsers);

      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      await service.generateReactionMap(messages);

      expect(paginatedFetchSpy).toHaveBeenCalled();
      expect(paginatedFetchSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle normal reactions', async () => {
      const messages = [createMsg('msg1', true)];
      const normalUsers = [createUser('user1')];

      let callCount = 0;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? normalUsers : [];
      });

      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']['👍']).toBeDefined();
      const normalReactions = result.reactionMap['msg1']['👍'].filter(r => !r.burst);
      expect(normalReactions).toHaveLength(1);
      expect(normalReactions[0].id).toBe('user1');
      expect(normalReactions[0].burst).toBe(false);
    });

    it('should handle burst reactions', async () => {
      const messages = [createMsg('msg1', true)];
      // Override to have both normal and burst counts
      messages[0].reactions = [
        { emoji: { name: '👍', id: null }, count: 2, count_details: { normal: 1, burst: 1 } },
      ];
      const burstUsers = [createUser('user2')];

      let callCount = 0;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async () => {
        callCount++;
        return callCount === 2 ? burstUsers : [];
      });

      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']['👍']).toBeDefined();
      const burstReactions = result.reactionMap['msg1']['👍'].filter(r => r.burst);
      expect(burstReactions).toHaveLength(1);
      expect(burstReactions[0].id).toBe('user2');
      expect(burstReactions[0].burst).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle messages without reactions', async () => {
      const messages = [
        createMsg('msg1', false),
        createMsg('msg2', false),
      ];

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap).toEqual({});
      expect(result.messages).toEqual(messages);
    });

    it('should handle empty reaction user list', async () => {
      const messages = [createMsg('msg1', true)];

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']['👍']).toBeDefined();
      expect(result.reactionMap['msg1']['👍']).toHaveLength(0);
    });

    it('should skip reactions when encodedEmoji is null', async () => {
      const messages = [createMsg('msg1', true)];

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue(null);

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']).toEqual({});
    });
  });

  describe('Status and Progress Callbacks', () => {
    it('should emit status updates for standard emoji', async () => {
      const messages = [createMsg('msg1', true)];
      const onStatus = vi.fn();

      mockConfig.onStatus = onStatus;
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      await service.generateReactionMap(messages);

      expect(onStatus).toHaveBeenCalledWith(
        expect.stringContaining('Retrieving reaction users for 👍 (1/1)'),
      );
    });

    it('should emit status updates for custom emoji', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        {
          emoji: { name: 'custom', id: 'custom123' },
          count: 1,
        },
      ];

      const onStatus = vi.fn();
      mockConfig.onStatus = onStatus;
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('custom:custom123');

      await service.generateReactionMap(messages);

      expect(onStatus).toHaveBeenCalledWith(
        expect.stringContaining('[custom]'),
      );
    });

    it('should emit progress callbacks', async () => {
      const messages = [createMsg('msg1', true), createMsg('msg2', true)];
      const onProgress = vi.fn();

      mockConfig.onProgress = onProgress;
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      await service.generateReactionMap(messages);

      expect(onProgress).toHaveBeenCalledWith({
        phase: 'generating_reaction_map',
        current: 1,
        total: 2,
        message: 'Processing reactions for message 1',
      });
      expect(onProgress).toHaveBeenCalledWith({
        phase: 'generating_reaction_map',
        current: 2,
        total: 2,
        message: 'Processing reactions for message 2',
      });
    });
  });

  describe('API Call Verification', () => {
    it('should handle multiple reactions on same message', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        { emoji: { name: '👍', id: null }, count: 2 },
        { emoji: { name: '❤️', id: null }, count: 1 },
      ];

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockImplementation((emoji) => emoji.name || '');

      const result = await service.generateReactionMap(messages);

      expect(result.reactionMap['msg1']['👍']).toBeDefined();
      expect(result.reactionMap['msg1']['❤️']).toBeDefined();
    });

    it('should fetch both normal and burst reaction types when both have counts', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        { emoji: { name: '👍', id: null }, count: 3, count_details: { normal: 2, burst: 1 }, me: false, me_burst: false, burst_colors: [] },
      ];

      // Mock to return different users for normal vs burst
      let callCount = 0;
      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? [createUser('user1')] : [createUser('user2')];
      });

      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      // Should have both normal and burst reactions
      expect(result.reactionMap['msg1']['👍']).toHaveLength(2);
      expect(result.reactionMap['msg1']['👍'][0].burst).toBe(false); // normal
      expect(result.reactionMap['msg1']['👍'][1].burst).toBe(true);  // burst
    });

    it('should skip burst fetch when count_details.burst is 0', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        { emoji: { name: '👍', id: null }, count: 2, count_details: { normal: 2, burst: 0 }, me: false, me_burst: false, burst_colors: [] },
      ];

      const paginatedFetchSpy = vi.spyOn(PaginationHelper.prototype, 'paginatedFetch')
        .mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      // Only 1 API call (normal), not 2 (normal + burst)
      expect(paginatedFetchSpy).toHaveBeenCalledTimes(1);
      // All reactions should be normal
      expect(result.reactionMap['msg1']['👍']).toHaveLength(1);
      expect(result.reactionMap['msg1']['👍'][0].burst).toBe(false);
    });

    it('should skip normal fetch when count_details.normal is 0', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        { emoji: { name: '🔥', id: null }, count: 1, count_details: { normal: 0, burst: 1 }, me: false, me_burst: true, burst_colors: ['#ff0000'] },
      ];

      const paginatedFetchSpy = vi.spyOn(PaginationHelper.prototype, 'paginatedFetch')
        .mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('🔥');

      const result = await service.generateReactionMap(messages);

      // Only 1 API call (burst), not 2
      expect(paginatedFetchSpy).toHaveBeenCalledTimes(1);
      expect(result.reactionMap['msg1']['🔥']).toHaveLength(1);
      expect(result.reactionMap['msg1']['🔥'][0].burst).toBe(true);
    });
  });

  describe('Early Termination', () => {
    it('should stop at message level when shouldStop returns true', async () => {
      const messages = [createMsg('msg1', true), createMsg('msg2', true)];

      let callCount = 0;
      mockConfig.shouldStop = vi.fn().mockImplementation(async () => {
        callCount++;
        // shouldStop called: 1) at msg1 start, 2) at msg1 reaction, 3) at msg2 start
        return callCount >= 3; // Stop at msg2 start
      });
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(mockConfig.shouldStop).toHaveBeenCalled();
      // Both messages get entries, but second one is empty (stopped before processing reactions)
      expect(Object.keys(result.reactionMap)).toHaveLength(2);
      expect(Object.keys(result.reactionMap['msg1'])).toHaveLength(1); // Has reactions
      expect(Object.keys(result.reactionMap['msg2'])).toHaveLength(0); // Empty, stopped early
    });

    it('should stop at reaction level when shouldStop returns true', async () => {
      const messages = [createMsg('msg1', true)];
      messages[0].reactions = [
        { emoji: { name: '👍', id: null }, count: 1 },
        { emoji: { name: '❤️', id: null }, count: 1 },
      ];

      let callCount = 0;
      mockConfig.shouldStop = vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount > 2; // Stop after first reaction
      });
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(mockConfig.shouldStop).toHaveBeenCalled();
    });

    it('should stop when shouldStop returns true immediately', async () => {
      const messages = [createMsg('msg1', true), createMsg('msg2', true)];

      mockConfig.shouldStop = vi.fn().mockResolvedValue(true);
      service = new ReactionEnrichmentService(mockConfig);

      vi.spyOn(PaginationHelper.prototype, 'paginatedFetch').mockResolvedValue([createUser('user1')]);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');

      const result = await service.generateReactionMap(messages);

      expect(mockConfig.shouldStop).toHaveBeenCalled();
      // First message gets an entry before shouldStop is checked
      expect(Object.keys(result.reactionMap)).toHaveLength(1);
      expect(Object.keys(result.reactionMap['msg1'])).toHaveLength(0); // Empty, stopped early
    });
  });
});
