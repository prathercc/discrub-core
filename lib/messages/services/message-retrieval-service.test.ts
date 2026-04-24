import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageRetrievalService } from './message-retrieval-service.ts';
import { MessageFetchService } from './message-fetch-service.ts';
import { ReactionEnrichmentService } from './reaction-enrichment-service.ts';
import { UserDataEnrichmentService } from './user-enrichment-service.ts';
import type { MessageFetchConfig, MessageRetrievalOptions } from '../types.ts';
import type { Message } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';

describe('MessageRetrievalService', () => {
  let service: MessageRetrievalService;
  let mockConfig: MessageFetchConfig;

  const createMockMessage = (id: string): Message => ({
    id,
    channel_id: 'channel-1',
    content: `Message ${id}`,
    timestamp: new Date().toISOString(),
    author: {
      id: 'user-1',
      username: 'testuser',
      discriminator: '0001',
    },
  } as Message);

  beforeEach(() => {
    vi.clearAllMocks();

    const mockSettings: AppSettings = {
      reactionsEnabled: true,
      purgeReactionRemovalFrom: null,
    } as AppSettings;

    mockConfig = {
      discordAdapter: {} as any,
      settings: mockSettings,
      existingUserMap: {},
      existingReactionMap: {},
    };

    service = new MessageRetrievalService(mockConfig);
  });

  describe('Three-Phase Pipeline', () => {
    it('should complete all three phases successfully', async () => {
      const mockMessages = [createMockMessage('1'), createMockMessage('2')];
      const mockThreads = [];

      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: mockThreads,
        totalMessages: 2,
      } as any);

      vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap').mockResolvedValue({
        reactionMap: { msg1: [] },
      } as any);

      vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData').mockResolvedValue({
        userMap: { 'user-1': { username: 'testuser' } },
      } as any);

      const result = await service.retrieveMessages('guild-1', 'channel-1');

      expect(result.messages).toEqual(mockMessages);
      expect(result.threads).toEqual(mockThreads);
      expect(result.userMap).toEqual({ 'user-1': { username: 'testuser' } });
      expect(result.reactionMap).toEqual({ msg1: [] });
    });

    it('should skip reaction enrichment when reactions disabled', async () => {
      const mockMessages = [createMockMessage('1')];

      mockConfig.settings.reactionsEnabled = false;
      service = new MessageRetrievalService(mockConfig);

      const fetchSpy = vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: [],
        totalMessages: 1,
      } as any);

      const reactionSpy = vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap').mockResolvedValue({
        reactionMap: {},
      } as any);

      vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData').mockResolvedValue({
        userMap: {},
      } as any);

      const result = await service.retrieveMessages('guild-1', 'channel-1', {});

      expect(result.messages).toEqual(mockMessages);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(reactionSpy).not.toHaveBeenCalled();
    });

    it('should skip user enrichment when excludeUserLookups is true', async () => {
      const mockMessages = [createMockMessage('1')];

      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: [],
        totalMessages: 1,
      } as any);

      vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap').mockResolvedValue({
        reactionMap: {},
      } as any);

      const userSpy = vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData').mockResolvedValue({
        userMap: {},
      } as any);

      const options: MessageRetrievalOptions = {
        excludeUserLookups: true,
      };

      const result = await service.retrieveMessages('guild-1', 'channel-1', options);

      expect(result.messages).toEqual(mockMessages);
      expect(userSpy).not.toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should call progress callback on completion', async () => {
      const mockMessages = [createMockMessage('1')];
      const onProgress = vi.fn();

      mockConfig.onProgress = onProgress;
      service = new MessageRetrievalService(mockConfig);

      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: [],
        totalMessages: 1,
      } as any);

      vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap').mockResolvedValue({
        reactionMap: {},
      } as any);

      vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData').mockResolvedValue({
        userMap: {},
      } as any);

      await service.retrieveMessages('guild-1', 'channel-1');

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'complete',
          current: 100,
          total: 100,
          message: 'Message retrieval complete',
        })
      );
    });
  });

  describe('Error Handling and Cancellation', () => {
    it('should handle shouldStop returning true', async () => {
      const mockMessages = [createMockMessage('1')];

      mockConfig.shouldStop = vi.fn().mockResolvedValue(true);
      service = new MessageRetrievalService(mockConfig);

      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: [],
        totalMessages: 1,
      } as any);

      const reactionSpy = vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap');
      const userSpy = vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData');

      const result = await service.retrieveMessages('guild-1', 'channel-1');

      expect(result.messages).toEqual(mockMessages);
      expect(reactionSpy).not.toHaveBeenCalled();
      expect(userSpy).not.toHaveBeenCalled();
    });

    it('should handle empty messages array', async () => {
      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: [],
        threads: [],
        totalMessages: 0,
      } as any);

      const reactionSpy = vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap');
      const userSpy = vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData');

      const result = await service.retrieveMessages('guild-1', 'channel-1');

      expect(result.messages).toEqual([]);
      expect(reactionSpy).not.toHaveBeenCalled();
      expect(userSpy).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    it('should merge existing reaction map with new reactions', async () => {
      const existingReactionMap = { msg1: [] };
      mockConfig.existingReactionMap = existingReactionMap;
      service = new MessageRetrievalService(mockConfig);

      const mockMessages = [createMockMessage('1')];

      vi.spyOn(MessageFetchService.prototype, 'fetchMessages').mockResolvedValue({
        messages: mockMessages,
        threads: [],
        totalMessages: 1,
      } as any);

      vi.spyOn(ReactionEnrichmentService.prototype, 'generateReactionMap').mockResolvedValue({
        reactionMap: { msg2: [] },
      } as any);

      vi.spyOn(UserDataEnrichmentService.prototype, 'enrichUserData').mockResolvedValue({
        userMap: {},
      } as any);

      const result = await service.retrieveMessages('guild-1', 'channel-1');

      expect(result.reactionMap).toEqual({ msg1: [], msg2: [] });
    });
  });
});
