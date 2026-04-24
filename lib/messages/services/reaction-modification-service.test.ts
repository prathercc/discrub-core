import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactionModificationService } from './reaction-modification-service.ts';
import type { ReactionModificationConfig } from '../types.ts';

describe('ReactionModificationService', () => {
  let service: ReactionModificationService;
  let mockConfig: ReactionModificationConfig;
  let mockApiClient: any;
  let mockThreadManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      deleteReaction: vi.fn(),
    };

    mockThreadManager = {
      liftThreadRestrictions: vi.fn(),
    };

    mockConfig = {
      apiClient: mockApiClient,
      token: 'test-token',
      threadManager: mockThreadManager,
      currentUserId: 'current-user',
    };

    service = new ReactionModificationService(mockConfig);
  });

  describe('Reaction Removal', () => {
    it('should remove single reaction successfully', async () => {
      mockApiClient.deleteReaction.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.deleteReaction(
        'channel-1',
        'msg-1',
        '👍',
        'user-1'
      );

      expect(result).toBe(true);
      expect(mockApiClient.deleteReaction).toHaveBeenCalledWith(
        'test-token',
        'channel-1',
        'msg-1',
        '👍',
        'user-1'
      );
      expect(mockThreadManager.liftThreadRestrictions).toHaveBeenCalledWith('channel-1', []);
    });

    it('should use @me for current user reactions', async () => {
      mockApiClient.deleteReaction.mockResolvedValue({ success: true });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.deleteReaction(
        'channel-1',
        'msg-1',
        '👍',
        'current-user' // Same as currentUserId in config
      );

      expect(result).toBe(true);
      expect(mockApiClient.deleteReaction).toHaveBeenCalledWith(
        'test-token',
        'channel-1',
        'msg-1',
        '👍',
        '@me' // Should be replaced with @me
      );
    });

    it('should handle removal errors gracefully', async () => {
      mockApiClient.deleteReaction.mockResolvedValue({ success: false });
      mockThreadManager.liftThreadRestrictions.mockResolvedValue([]);

      const result = await service.deleteReaction(
        'channel-1',
        'msg-1',
        '👍',
        'user-1'
      );

      expect(result).toBe(false);
      expect(mockApiClient.deleteReaction).toHaveBeenCalled();
    });
  });
});
