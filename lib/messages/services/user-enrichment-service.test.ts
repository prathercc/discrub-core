import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserDataEnrichmentService } from './user-enrichment-service.ts';
import type { UserEnrichmentConfig } from '../types.ts';
import type { Message } from '../../types/discord-types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';
import * as utils from '../utils.ts';

describe('UserDataEnrichmentService', () => {
  let service: UserDataEnrichmentService;
  let mockConfig: UserEnrichmentConfig;
  let mockApiClient: any;

  const createMsg = (id: string, authorId: string, content: string = ''): Message => ({
    id,
    channel_id: 'channel-1',
    content,
    timestamp: new Date().toISOString(),
    author: {
      id: authorId,
      username: `user${authorId}`,
      discriminator: '0001',
      global_name: `Display${authorId}`,
      avatar: `avatar${authorId}`,
    },
  } as Message);

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      getUser: vi.fn(),
      fetchGuildUser: vi.fn(),
    };

    const mockSettings: AppSettings = {
      reactionsEnabled: true,
      displayNameLookup: true,
      serverNickNameLookup: true,
      userDataRefreshRate: 30,
    } as AppSettings;

    mockConfig = {
      apiClient: mockApiClient,
      token: 'test-token',
      settings: mockSettings,
      existingUserMap: {},
      existingReactionMap: {},
    };

    service = new UserDataEnrichmentService(mockConfig);
  });

  describe('User Data Collection', () => {
    it('should collect user IDs from message authors', async () => {
      const messages = [
        createMsg('msg1', 'user1'),
        createMsg('msg2', 'user2'),
        createMsg('msg3', 'user1'), // Duplicate author
      ];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);

      const result = await service.enrichUserData(messages, null);

      expect(Object.keys(result.userMap)).toHaveLength(2);
      expect(result.userMap['user1']).toBeDefined();
      expect(result.userMap['user2']).toBeDefined();
      expect(result.userMap['user1'].userName).toBe('useruser1');
    });

    it('should collect user IDs from mentions and reactions', async () => {
      const messages = [createMsg('msg1', 'user1', 'Hello <@user2>')];
      messages[0].reactions = [
        {
          emoji: { name: '👍', id: null },
          count: 1,
        },
      ];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      mockConfig.existingReactionMap = {
        msg1: {
          '👍': [{ id: 'user3', username: 'useruser3' }],
        },
      };
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue(['user2']);
      vi.spyOn(utils, 'getEncodedEmoji').mockReturnValue('👍');
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);

      const result = await service.enrichUserData(messages, null);

      expect(Object.keys(result.userMap)).toHaveLength(3);
      expect(result.userMap['user1']).toBeDefined(); // Author
      expect(result.userMap['user2']).toBeDefined(); // Mention
      expect(result.userMap['user3']).toBeDefined(); // Reaction
    });
  });

  describe('Staleness Detection', () => {
    it('should fetch user data when no timestamp exists', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockApiClient.getUser.mockResolvedValue({
        success: true,
        data: {
          id: 'user1',
          username: 'updateduser1',
          global_name: 'UpdatedDisplay1',
          avatar: 'newavatar1',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);
      vi.spyOn(utils, 'getUserMappingData').mockReturnValue({
        userName: 'updateduser1',
        displayName: 'UpdatedDisplay1',
        avatar: 'newavatar1',
        timestamp: Date.now(),
        guilds: {},
      });

      const result = await service.enrichUserData(messages, null);

      expect(mockApiClient.getUser).toHaveBeenCalledWith('test-token', 'user1');
      expect(result.userMap['user1'].userName).toBe('updateduser1');
    });

    it('should fetch user data when data is stale', async () => {
      const staleTimestamp = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.existingUserMap = {
        user1: {
          userName: 'olduser1',
          displayName: 'OldDisplay1',
          avatar: 'oldavatar1',
          timestamp: staleTimestamp,
          guilds: {},
        },
      };
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.getUser.mockResolvedValue({
        success: true,
        data: {
          id: 'user1',
          username: 'freshuser1',
          global_name: 'FreshDisplay1',
          avatar: 'freshavatar1',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);
      vi.spyOn(utils, 'getUserMappingData').mockReturnValue({
        userName: 'freshuser1',
        displayName: 'FreshDisplay1',
        avatar: 'freshavatar1',
        timestamp: Date.now(),
        guilds: {},
      });

      const result = await service.enrichUserData(messages, null);

      expect(mockApiClient.getUser).toHaveBeenCalledWith('test-token', 'user1');
      expect(result.userMap['user1'].userName).toBe('freshuser1');
    });

    it('should skip fetching when data is fresh', async () => {
      const freshTimestamp = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.existingUserMap = {
        user1: {
          userName: 'freshuser1',
          displayName: 'FreshDisplay1',
          avatar: 'freshavatar1',
          timestamp: freshTimestamp,
          guilds: {},
        },
      };
      mockConfig.settings.userDataRefreshRate = 30; // 30 days
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);

      const result = await service.enrichUserData(messages, null);

      expect(mockApiClient.getUser).not.toHaveBeenCalled();
      expect(result.userMap['user1'].userName).toBe('freshuser1');
    });
  });

  describe('Settings Respect', () => {
    it('should skip display name lookup when disabled', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);

      const result = await service.enrichUserData(messages, null);

      expect(mockApiClient.getUser).not.toHaveBeenCalled();
      expect(result.userMap['user1']).toBeDefined();
    });

    it('should skip guild data lookup when disabled', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);

      const result = await service.enrichUserData(messages, 'guild1');

      expect(mockApiClient.fetchGuildUser).not.toHaveBeenCalled();
      expect(result.userMap['user1']).toBeDefined();
    });
  });

  describe('Avatar URL Extraction', () => {
    it('should extract avatar URLs from user data', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const result = await service.enrichUserData(messages, null);

      expect(result.userMap['user1'].avatar).toBe('avataruser1');
    });
  });

  describe('API Failure Handling', () => {
    it('should handle API failure when fetching display names', async () => {
      const messages = [createMsg('msg1', 'user1')];
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiClient.getUser.mockResolvedValue({
        success: false,
        data: null,
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);

      const result = await service.enrichUserData(messages, null);

      expect(mockApiClient.getUser).toHaveBeenCalledWith('test-token', 'user1');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unable to retrieve data from userId: user1');
      expect(result.userMap['user1'].userName).toBe('useruser1'); // Original data preserved

      consoleErrorSpy.mockRestore();
    });

    it('should handle API failure when fetching guild data', async () => {
      const messages = [createMsg('msg1', 'user1')];
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.fetchGuildUser.mockResolvedValue({
        success: false,
        data: null,
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);

      const result = await service.enrichUserData(messages, 'guild1');

      expect(mockApiClient.fetchGuildUser).toHaveBeenCalledWith('guild1', 'user1', 'test-token');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unable to retrieve guild user data from userId user1 and guildId guild1',
      );
      expect(result.userMap['user1'].guilds['guild1']).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Guild Data Enrichment', () => {
    it('should fetch guild data when enabled and stale', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.fetchGuildUser.mockResolvedValue({
        success: true,
        data: {
          nick: 'ServerNick1',
          avatar: 'serveravatar1',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);
      vi.spyOn(utils, 'getGMOMappingData').mockReturnValue({
        nickName: 'ServerNick1',
        avatar: 'serveravatar1',
        timestamp: Date.now(),
      });

      const result = await service.enrichUserData(messages, 'guild1');

      expect(mockApiClient.fetchGuildUser).toHaveBeenCalledWith('guild1', 'user1', 'test-token');
      expect(result.userMap['user1'].guilds['guild1']).toBeDefined();
      expect(result.userMap['user1'].guilds['guild1'].nickName).toBe('ServerNick1');
    });

    it('should skip guild data fetch when no guild ID provided', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);

      await service.enrichUserData(messages, null);

      expect(mockApiClient.fetchGuildUser).not.toHaveBeenCalled();
    });

    it('should use existing guild data when fresh', async () => {
      const freshTimestamp = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      mockConfig.settings.userDataRefreshRate = 30; // 30 days
      mockConfig.existingUserMap = {
        user1: {
          userName: 'useruser1',
          displayName: 'Displayuser1',
          avatar: 'avataruser1',
          timestamp: freshTimestamp,
          guilds: {
            guild1: {
              nickName: 'OldNick',
              avatar: 'oldguildavatar',
              timestamp: freshTimestamp,
            },
          },
        },
      };
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);

      const result = await service.enrichUserData(messages, 'guild1');

      expect(mockApiClient.fetchGuildUser).not.toHaveBeenCalled();
      expect(result.userMap['user1'].guilds['guild1'].nickName).toBe('OldNick');
    });

    it('should fetch guild data when guild not in map', async () => {
      const messages = [createMsg('msg1', 'user1')];

      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      mockConfig.existingUserMap = {
        user1: {
          userName: 'useruser1',
          displayName: 'Displayuser1',
          avatar: 'avataruser1',
          timestamp: Date.now(),
          guilds: {},
        },
      };
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.fetchGuildUser.mockResolvedValue({
        success: true,
        data: {
          nick: 'NewGuildNick',
          avatar: 'newguildavatar',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);
      vi.spyOn(utils, 'getGMOMappingData').mockReturnValue({
        nickName: 'NewGuildNick',
        avatar: 'newguildavatar',
        timestamp: Date.now(),
      });

      const result = await service.enrichUserData(messages, 'guild1');

      expect(mockApiClient.fetchGuildUser).toHaveBeenCalledWith('guild1', 'user1', 'test-token');
      expect(result.userMap['user1'].guilds['guild1'].nickName).toBe('NewGuildNick');
    });
  });

  describe('Progress and Status Callbacks', () => {
    it('should emit progress updates', async () => {
      const messages = [createMsg('msg1', 'user1'), createMsg('msg2', 'user2')];
      const onProgress = vi.fn();

      mockConfig.onProgress = onProgress;
      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(false);

      await service.enrichUserData(messages, null);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith({
        phase: 'enriching_user_data',
        current: 1,
        total: 2,
        message: 'Processing user 1/2',
      });
      expect(onProgress).toHaveBeenCalledWith({
        phase: 'enriching_user_data',
        current: 2,
        total: 2,
        message: 'Processing user 2/2',
      });
    });

    it('should emit status updates when fetching display names', async () => {
      const messages = [createMsg('msg1', 'user1')];
      const onStatus = vi.fn();

      mockConfig.onStatus = onStatus;
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.getUser.mockResolvedValue({
        success: true,
        data: {
          id: 'user1',
          username: 'newuser1',
          global_name: 'NewDisplay1',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);
      vi.spyOn(utils, 'getUserMappingData').mockReturnValue({
        userName: 'newuser1',
        displayName: 'NewDisplay1',
        avatar: null,
        timestamp: Date.now(),
        guilds: {},
      });

      await service.enrichUserData(messages, null);

      expect(onStatus).toHaveBeenCalledWith('Retrieving user alias for useruser1');
    });

    it('should emit status updates when fetching guild data', async () => {
      const messages = [createMsg('msg1', 'user1')];
      const onStatus = vi.fn();

      mockConfig.onStatus = onStatus;
      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = true;
      service = new UserDataEnrichmentService(mockConfig);

      mockApiClient.fetchGuildUser.mockResolvedValue({
        success: true,
        data: {
          nick: 'GuildNick',
        },
      });

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);
      vi.spyOn(utils, 'isUserDataStale').mockReturnValue(true);
      vi.spyOn(utils, 'getGMOMappingData').mockReturnValue({
        nickName: 'GuildNick',
        avatar: null,
        timestamp: Date.now(),
      });

      await service.enrichUserData(messages, 'guild1');

      expect(onStatus).toHaveBeenCalledWith('Retrieving server data for useruser1');
    });
  });

  describe('Early Termination', () => {
    it('should stop processing when shouldStop returns true', async () => {
      const messages = [createMsg('msg1', 'user1'), createMsg('msg2', 'user2')];

      mockConfig.shouldStop = vi.fn().mockResolvedValue(true);
      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      await service.enrichUserData(messages, null);

      expect(mockConfig.shouldStop).toHaveBeenCalled();
    });

    it('should stop processing when shouldStop returns true immediately', async () => {
      const messages = [createMsg('msg1', 'user1'), createMsg('msg2', 'user2')];

      mockConfig.shouldStop = vi.fn().mockResolvedValue(true);
      mockConfig.settings.displayNameLookup = false;
      mockConfig.settings.serverNickNameLookup = false;
      service = new UserDataEnrichmentService(mockConfig);

      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      await service.enrichUserData(messages, null);

      // Should exit early without processing all users
      expect(mockConfig.shouldStop).toHaveBeenCalled();
    });
  });

  describe('failedUserIds', () => {
    it('should return 404 user IDs in failedUserIds', async () => {
      mockApiClient.getUser.mockResolvedValue({ success: false, status: 404 });
      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const messages = [createMsg('m1', 'deleted-user')];
      const result = await service.enrichUserData(messages, null);

      expect(result.failedUserIds).toEqual(['deleted-user']);
    });

    it('should NOT include 403 errors in failedUserIds', async () => {
      mockApiClient.getUser.mockResolvedValue({ success: false, status: 403 });
      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const messages = [createMsg('m1', 'private-user')];
      const result = await service.enrichUserData(messages, null);

      expect(result.failedUserIds).toBeUndefined();
    });

    it('should NOT include 500 errors in failedUserIds', async () => {
      mockApiClient.getUser.mockResolvedValue({ success: false, status: 500 });
      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const messages = [createMsg('m1', 'server-error-user')];
      const result = await service.enrichUserData(messages, null);

      expect(result.failedUserIds).toBeUndefined();
    });

    it('should skip users in skipUserIds config', async () => {
      mockConfig.skipUserIds = ['skip-me'];
      service = new UserDataEnrichmentService(mockConfig);
      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const messages = [createMsg('m1', 'skip-me'), createMsg('m2', 'normal-user')];
      mockApiClient.getUser.mockResolvedValue({ success: true, status: 200, data: { id: 'normal-user', username: 'normal', global_name: 'Normal', avatar: null } });

      await service.enrichUserData(messages, null);

      // getUser should only be called for normal-user, not skip-me
      expect(mockApiClient.getUser).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getUser).toHaveBeenCalledWith(expect.any(String), 'normal-user');
    });

    it('should collect multiple 404 failures', async () => {
      mockApiClient.getUser.mockResolvedValue({ success: false, status: 404 });
      vi.spyOn(utils, 'extractMentionedUserIds').mockReturnValue([]);

      const messages = [createMsg('m1', 'gone1'), createMsg('m2', 'gone2')];
      const result = await service.enrichUserData(messages, null);

      expect(result.failedUserIds).toEqual(['gone1', 'gone2']);
    });
  });
});
