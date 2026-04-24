import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurgeService } from './purge-service.ts';
import { MessageModificationService } from './message-modification-service.ts';
import { ReactionModificationService } from './reaction-modification-service.ts';
import { PurgeStatus } from '../../enum/discrub-enum.ts';
import type { PurgeConfig } from '../types.ts';
import type { Message } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';

describe('PurgeService', () => {
  let service: PurgeService;
  let mockConfig: PurgeConfig;
  let mockApiClient: any;
  let mockThreadManager: any;
  let mockProgressManager: any;

  const createMsg = (id: string, type: number = 0, hasAttachments: boolean = false): Message => {
    const msg: Message = {
      id,
      channel_id: 'channel-1',
      content: 'Test message',
      timestamp: new Date().toISOString(),
      type,
      author: {
        id: 'user-1',
        username: 'testuser',
        discriminator: '0001',
      },
      attachments: hasAttachments ? [{ id: 'att1', filename: 'file.txt' } as any] : [],
    } as Message;
    return msg;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      deleteMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteReaction: vi.fn(),
    };

    mockThreadManager = {
      liftThreadRestrictions: vi.fn(),
    };

    mockProgressManager = {
      setModifyEntity: vi.fn(),
    };

    const mockSettings: AppSettings = {
      retainAttachedMedia: false,
      reactionRemovalFrom: [],
    } as AppSettings;

    mockConfig = {
      apiClient: mockApiClient,
      token: 'test-token',
      settings: mockSettings,
      threadManager: mockThreadManager,
      progressManager: mockProgressManager,
      currentUserId: 'current-user',
    };

    service = new PurgeService(mockConfig);
  });

  describe('Purge Operations', () => {
    it('should delete messages with status tracking', async () => {
      const messages = [
        createMsg('msg1', 0),
        createMsg('msg2', 0),
        createMsg('msg3', 0),
      ];

      mockApiClient.deleteMessage.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(3);
      expect(result.removedCount).toBe(3);
      expect(mockApiClient.deleteMessage).toHaveBeenCalledTimes(3);
      expect(mockProgressManager.setModifyEntity).toHaveBeenCalled();
    });

    it('should skip threads in skipList', async () => {
      const messages = [
        createMsg('msg1', 0),
        createMsg('msg2', 0),
      ];
      messages[1].channel_id = 'restricted-channel';

      mockApiClient.deleteMessage.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockImplementation(async (channelId, skipIds) => {
        if (channelId === 'restricted-channel') {
          return ['restricted-channel'];
        }
        return skipIds;
      });

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(2);
      expect(result.removedCount).toBe(1); // Only first message removed
      expect(mockApiClient.deleteMessage).toHaveBeenCalledTimes(1);
      expect(result.skipThreadIds).toContain('restricted-channel');
    });

    it('should skip messages in skipList', async () => {
      const messages = [
        createMsg('msg1', 0),
        createMsg('msg2', 0),
        createMsg('msg3', 0),
      ];

      mockApiClient.deleteMessage.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.processMessages(messages, [], ['msg2']);

      expect(result.processedCount).toBe(2); // msg1 and msg3
      expect(result.removedCount).toBe(2);
      expect(mockApiClient.deleteMessage).toHaveBeenCalledTimes(2);
    });

    it('should preserve attachments when configured', async () => {
      const messages = [createMsg('msg1', 0, true)];
      messages[0].content = 'Message with attachment';

      mockConfig.settings.retainAttachedMedia = true;
      service = new PurgeService(mockConfig);

      mockApiClient.editMessage.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(1);
      expect(result.removedCount).toBe(1); // Content cleared, attachment kept
      expect(mockApiClient.editMessage).toHaveBeenCalledWith(
        'test-token',
        'msg1',
        { content: '', attachments: messages[0].attachments },
        'channel-1'
      );
      expect(mockApiClient.deleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('Reaction Removal', () => {
    it('should remove reactions before delete', async () => {
      const messages = [createMsg('msg1', 0)];

      mockConfig.settings.reactionRemovalFrom = ['user1', 'user2'];
      mockConfig.existingReactionMap = {
        msg1: {
          '👍': [
            { id: 'user1', burst: false },
            { id: 'user2', burst: false },
          ],
        },
      };
      service = new PurgeService(mockConfig);

      vi.spyOn(ReactionModificationService.prototype, 'deleteReaction').mockResolvedValue(true);
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(1);
      expect(ReactionModificationService.prototype.deleteReaction).toHaveBeenCalledTimes(2);
      expect(mockProgressManager.setModifyEntity).toHaveBeenCalled();
    });

    it('should track partial reaction removal', async () => {
      const messages = [createMsg('msg1', 0)];

      mockConfig.settings.reactionRemovalFrom = ['user1', 'user2'];
      mockConfig.existingReactionMap = {
        msg1: {
          '👍': [
            { id: 'user1', burst: false },
            { id: 'user2', burst: false },
          ],
        },
      };
      service = new PurgeService(mockConfig);

      let callCount = 0;
      vi.spyOn(ReactionModificationService.prototype, 'deleteReaction').mockImplementation(async () => {
        callCount++;
        return callCount === 1; // First succeeds, second fails
      });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(1);
      expect(ReactionModificationService.prototype.deleteReaction).toHaveBeenCalledTimes(2);
      // Partial removal tracked via status updates
      expect(mockProgressManager.setModifyEntity).toHaveBeenCalled();
    });
  });

  describe('Permission Validation', () => {
    it('should check thread permissions', async () => {
      const messages = [
        createMsg('msg1', 0),
        createMsg('msg2', 0),
      ];

      mockApiClient.deleteMessage.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue(['channel-1']);

      const result = await service.processMessages(messages, [], []);

      expect(result.processedCount).toBe(2);
      expect(result.removedCount).toBe(0); // No messages removed due to missing permission
      expect(mockApiClient.deleteMessage).not.toHaveBeenCalled();
    });

    it('should mark MISSING_PERMISSION status', async () => {
      const messages = [createMsg('msg1', 0)];

      mockThreadManager.liftThreadRestrictions.mockResolvedValue(['channel-1']);

      await service.processMessages(messages, [], []);

      expect(mockProgressManager.setModifyEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          _status: PurgeStatus.MISSING_PERMISSION,
        })
      );
    });
  });
});
