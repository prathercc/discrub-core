import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscordService } from './discord-service.ts';
import {
  mockUser,
  mockGuild,
  mockTextChannel,
  mockMessage,
  mockRole,
  createMockMessages,
  mockSuccessResponse,
  mockErrorResponse,
  mockRateLimitResponse,
} from '../__tests__/test-fixtures.ts';
import {
  mockFetchSuccess,
  mockFetchError,
  mockFetchRateLimit,
  wait,
  clearAllMocks,
} from '../__tests__/test-utils.ts';
import { AppSettings, SearchCriteria } from '../types/discrub-types.ts';
import { QueryStringParam, ReactionType } from '../enum/discord-enum.ts';

describe('DiscordService', () => {
  let service: DiscordService;
  const testAuth = 'test-auth-token';
  const testUserId = '123456789';
  const testGuildId = '987654321';
  const testChannelId = '555666777';
  const testMessageId = '111222333';

  beforeEach(() => {
    service = new DiscordService();
    clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default settings when no settings provided', () => {
      const defaultService = new DiscordService();
      expect(defaultService.searchDelaySecs).toBe(0);
      expect(defaultService.deleteDelaySecs).toBe(0);
      expect(defaultService.delayModifierSecs).toBe(0);
    });

    it('should initialize with provided settings', () => {
      const settings: AppSettings = {
        searchDelay2: 2,
        deleteDelay2: 3,
        delayModifier2: 1,
      } as AppSettings;
      const customService = new DiscordService(settings);
      expect(customService.searchDelaySecs).toBe(2);
      expect(customService.deleteDelaySecs).toBe(3);
      expect(customService.delayModifierSecs).toBe(1);
    });

    it('should set correct Discord API endpoints', () => {
      expect(service.DISCORD_API_URL).toBe('https://discord.com/api/v10');
      expect(service.DISCORD_USERS_ENDPOINT).toBe('https://discord.com/api/v10/users');
      expect(service.DISCORD_GUILDS_ENDPOINT).toBe('https://discord.com/api/v10/guilds');
      expect(service.DISCORD_CHANNELS_ENDPOINT).toBe('https://discord.com/api/v10/channels');
    });

    it('should not have a hardcoded user agent', () => {
      expect((service as any).userAgent).toBeUndefined();
    });
  });

  describe('HTTP Methods', () => {
    describe('GET requests', () => {
      it('should make GET request with correct headers', async () => {
        const mockFetch = mockFetchSuccess(mockUser);
        vi.stubGlobal('fetch', mockFetch);

        await service.getUser(testAuth, testUserId);

        expect(mockFetch).toHaveBeenCalledWith(
          `${service.DISCORD_USERS_ENDPOINT}/${testUserId}`,
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              authorization: testAuth,
            }),
          })
        );
      });

      it('should return data on successful GET request', async () => {
        vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

        const result = await service.getUser(testAuth, testUserId);

        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toEqual(mockUser);
      });

      it('should handle GET request with no data (204)', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        });
        vi.stubGlobal('fetch', mockFetch);

        const result = await service.deleteMessage(testAuth, testMessageId, testChannelId);

        expect(result.success).toBe(true);
        expect(result.data).toBeUndefined();
      });
    });

    describe('POST requests', () => {
      it('should make POST request with correct headers and body', async () => {
        const mockFetch = mockFetchSuccess({});
        vi.stubGlobal('fetch', mockFetch);

        const body = { recipient_id: testUserId };
        await service.createDm(testAuth, testUserId);

        expect(mockFetch).toHaveBeenCalledWith(
          `${service.DISCORD_USERS_ENDPOINT}/@me/channels`,
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              authorization: testAuth,
            }),
            body: JSON.stringify(body),
          })
        );
      });

      it('should handle POST request without body', async () => {
        const mockFetch = mockFetchSuccess({});
        vi.stubGlobal('fetch', mockFetch);

        await service.createDm(testAuth, testUserId);

        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('PATCH requests', () => {
      it('should make PATCH request with correct headers and body', async () => {
        const mockFetch = mockFetchSuccess(mockMessage);
        vi.stubGlobal('fetch', mockFetch);

        const updateProps = { content: 'Updated message' };
        await service.editMessage(testAuth, testMessageId, updateProps, testChannelId);

        expect(mockFetch).toHaveBeenCalledWith(
          `${service.DISCORD_CHANNELS_ENDPOINT}/${testChannelId}/messages/${testMessageId}`,
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              authorization: testAuth,
            }),
            body: JSON.stringify(updateProps),
          })
        );
      });

      it('should return updated data on successful PATCH', async () => {
        const updatedMessage = { ...mockMessage, content: 'Updated' };
        vi.stubGlobal('fetch', mockFetchSuccess(updatedMessage));

        const result = await service.editMessage(
          testAuth,
          testMessageId,
          { content: 'Updated' },
          testChannelId
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(updatedMessage);
      });
    });

    describe('DELETE requests', () => {
      it('should make DELETE request with correct headers', async () => {
        const mockFetch = mockFetchSuccess(undefined);
        vi.stubGlobal('fetch', mockFetch);

        await service.deleteMessage(testAuth, testMessageId, testChannelId);

        expect(mockFetch).toHaveBeenCalledWith(
          `${service.DISCORD_CHANNELS_ENDPOINT}/${testChannelId}/messages/${testMessageId}`,
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              authorization: testAuth,
            }),
          })
        );
      });

      it('should return success on successful DELETE', async () => {
        vi.stubGlobal('fetch', mockFetchSuccess(undefined));

        const result = await service.deleteMessage(testAuth, testMessageId, testChannelId);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Rate Limiting (429 Handling)', () => {
    it('should retry after rate limit with retry_after value', async () => {
      const retryAfter = 0.1; // 100ms for fast testing
      let callCount = 0;
      const mockFetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockRateLimitResponse(retryAfter));
        }
        return Promise.resolve(mockSuccessResponse(mockUser));
      });
      vi.stubGlobal('fetch', mockFetch);

      const startTime = Date.now();
      const result = await service.getUser(testAuth, testUserId);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeGreaterThanOrEqual(retryAfter * 1000 * 0.9); // Allow 10% margin
    });

    it('should handle multiple consecutive rate limits', async () => {
      const retryAfter = 0.05; // 50ms
      let callCount = 0;
      const mockFetch = vi.fn(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve(mockRateLimitResponse(retryAfter));
        }
        return Promise.resolve(mockSuccessResponse(mockUser));
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should extract retry_after from response JSON', async () => {
      const retryAfter = 0.1;
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(mockRateLimitResponse(retryAfter))
        .mockResolvedValueOnce(mockSuccessResponse(mockUser));
      vi.stubGlobal('fetch', mockFetch);

      const waitSpy = vi.spyOn(await import('../utils/common-utils.ts'), 'wait');

      await service.getUser(testAuth, testUserId);

      expect(waitSpy).toHaveBeenCalledWith(retryAfter);
    });
  });

  describe('Delay Management', () => {
    it('should apply search delay when configured', async () => {
      const settings: AppSettings = {
        searchDelay2: 0.1, // 100ms
        deleteDelay2: 0,
        delayModifier2: 0,
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      const onDelay = vi.fn();
      delayedService.onDelay = onDelay;
      vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

      const startTime = Date.now();
      await delayedService.getUser(testAuth, testUserId);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90); // 100ms - 10% margin
      expect(onDelay).toHaveBeenCalledWith(expect.any(Number), 'search');
    });

    it('should apply delete delay when configured', async () => {
      const settings: AppSettings = {
        searchDelay2: 0,
        deleteDelay2: 0.1, // 100ms
        delayModifier2: 0,
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      const onDelay = vi.fn();
      delayedService.onDelay = onDelay;
      vi.stubGlobal('fetch', mockFetchSuccess(undefined));

      const startTime = Date.now();
      await delayedService.deleteMessage(testAuth, testMessageId, testChannelId);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(onDelay).toHaveBeenCalledWith(expect.any(Number), 'delete');
    });

    it('should apply random variance with delayModifier', async () => {
      const settings: AppSettings = {
        searchDelay2: 0.1,
        deleteDelay2: 0,
        delayModifier2: 0.05, // ±50ms variance
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await delayedService.getUser(testAuth, testUserId);
        delays.push(Date.now() - startTime);
      }

      // Check that delays vary (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // Check all delays are within expected range (50ms to 150ms)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(40); // 50ms - margin
        expect(delay).toBeLessThanOrEqual(160); // 150ms + margin
      });
    });

    it('should not apply delay when delayType is "none"', async () => {
      const settings: AppSettings = {
        searchDelay2: 1,
        deleteDelay2: 1,
        delayModifier2: 0,
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      vi.stubGlobal('fetch', mockFetchSuccess([mockGuild]));

      const startTime = Date.now();
      await delayedService.fetchGuilds(testAuth); // Uses delayType: "none"
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100); // Should be nearly instant
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle delay with minimum of 0 when modifier exceeds delay', async () => {
      const settings: AppSettings = {
        searchDelay2: 0.05, // 50ms
        deleteDelay2: 0,
        delayModifier2: 0.1, // 100ms modifier (larger than delay)
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

      // Should not throw error, minimum should be clamped to 0
      await expect(delayedService.getUser(testAuth, testUserId)).resolves.toBeDefined();
    });
  });

  describe('User Operations', () => {
    it('should fetch user by ID', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should fetch current user data', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(mockUser));

      const result = await service.fetchUserData(testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_USERS_ENDPOINT}/@me`,
        expect.any(Object)
      );
    });

    it('should fetch guild member', async () => {
      const mockGuildMember = {
        user: mockUser,
        nick: 'TestNick',
        roles: ['role1', 'role2'],
        joined_at: '2023-01-01T00:00:00.000Z',
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockGuildMember));

      const result = await service.fetchGuildUser(testGuildId, testUserId, testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGuildMember);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_GUILDS_ENDPOINT}/${testGuildId}/members/${testUserId}`,
        expect.any(Object)
      );
    });

    it('should fetch direct messages', async () => {
      const mockChannels = [mockTextChannel];
      vi.stubGlobal('fetch', mockFetchSuccess(mockChannels));

      const result = await service.fetchDirectMessages(testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChannels);
    });

    it('should create DM with user', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(mockTextChannel));

      const result = await service.createDm(testAuth, testUserId);

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_USERS_ENDPOINT}/@me/channels`,
        expect.objectContaining({
          body: JSON.stringify({ recipient_id: testUserId }),
        })
      );
    });

    it('should send friend request', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess({}));

      const props = { username: 'testuser', discriminator: '0001' };
      const result = await service.sendFriendRequest(testAuth, props);

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_USERS_ENDPOINT}/@me/relationships`,
        expect.objectContaining({
          body: JSON.stringify(props),
        })
      );
    });

    it('should delete friend request', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(undefined));

      const result = await service.deleteFriendRequest(testAuth, testUserId);

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_USERS_ENDPOINT}/@me/relationships/${testUserId}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should get relationships', async () => {
      const mockRelationships = [{ id: '1', type: 1 }, { id: '2', type: 2 }];
      vi.stubGlobal('fetch', mockFetchSuccess(mockRelationships));

      const result = await service.getRelationships(testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRelationships);
    });
  });

  describe('Guild and Channel Operations', () => {
    it('should fetch guilds', async () => {
      const mockGuilds = [mockGuild];
      vi.stubGlobal('fetch', mockFetchSuccess(mockGuilds));

      const result = await service.fetchGuilds(testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGuilds);
    });

    it('should fetch roles', async () => {
      const mockRoles = [mockRole];
      vi.stubGlobal('fetch', mockFetchSuccess(mockRoles));

      const result = await service.fetchRoles(testGuildId, testAuth);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRoles);
    });

    it('should fetch channels', async () => {
      const mockChannels = [mockTextChannel];
      vi.stubGlobal('fetch', mockFetchSuccess(mockChannels));

      const result = await service.fetchChannels(testAuth, testGuildId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChannels);
    });

    it('should fetch single channel', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(mockTextChannel));

      const result = await service.fetchChannel(testAuth, testChannelId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTextChannel);
    });

    it('should edit channel', async () => {
      const updateObj = { name: 'new-channel-name' };
      const updatedChannel = { ...mockTextChannel, name: 'new-channel-name' };
      vi.stubGlobal('fetch', mockFetchSuccess(updatedChannel));

      const result = await service.editChannel(testAuth, testChannelId, updateObj);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedChannel);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `${service.DISCORD_CHANNELS_ENDPOINT}/${testChannelId}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateObj),
        })
      );
    });
  });

  describe('Message Operations', () => {
    it('should fetch messages with default parameters', async () => {
      const mockMessages = createMockMessages(10);
      vi.stubGlobal('fetch', mockFetchSuccess(mockMessages));

      const result = await service.fetchMessageData(testAuth, '', testChannelId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMessages);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.any(Object)
      );
    });

    it('should fetch messages before a message ID', async () => {
      const mockMessages = createMockMessages(10);
      vi.stubGlobal('fetch', mockFetchSuccess(mockMessages));

      await service.fetchMessageData(
        testAuth,
        testMessageId,
        testChannelId,
        QueryStringParam.BEFORE
      );

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`before=${testMessageId}`),
        expect.any(Object)
      );
    });

    it('should fetch messages after a message ID', async () => {
      const mockMessages = createMockMessages(10);
      vi.stubGlobal('fetch', mockFetchSuccess(mockMessages));

      await service.fetchMessageData(
        testAuth,
        testMessageId,
        testChannelId,
        QueryStringParam.AFTER
      );

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`after=${testMessageId}`),
        expect.any(Object)
      );
    });

    it('should fetch 50 messages when using AROUND parameter', async () => {
      const mockMessages = createMockMessages(50);
      vi.stubGlobal('fetch', mockFetchSuccess(mockMessages));

      await service.fetchMessageData(
        testAuth,
        testMessageId,
        testChannelId,
        QueryStringParam.AROUND
      );

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`around=${testMessageId}`),
        expect.any(Object)
      );
    });

    it('should edit message', async () => {
      const updateProps = { content: 'Edited content' };
      const editedMessage = { ...mockMessage, content: 'Edited content' };
      vi.stubGlobal('fetch', mockFetchSuccess(editedMessage));

      const result = await service.editMessage(
        testAuth,
        testMessageId,
        updateProps,
        testChannelId
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(editedMessage);
    });

    it('should delete message', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(undefined));

      const result = await service.deleteMessage(testAuth, testMessageId, testChannelId);

      expect(result.success).toBe(true);
    });
  });

  describe('Search Query Construction', () => {
    const baseSearchCriteria: SearchCriteria = {
      userIds: [],
      searchAfterDate: null,
      searchBeforeDate: null,
      searchMessageContent: '',
      selectedHasTypes: [],
      isPinned: 'false',
      mentionIds: [],
      channelIds: [],
    };

    it('should construct search params with user IDs', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        userIds: ['user1', 'user2'],
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('author_id=user1');
      expect(params).toContain('author_id=user2');
    });

    it('should construct search params with date range', () => {
      const afterDate = new Date('2023-01-01');
      const beforeDate = new Date('2023-12-31');
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        searchAfterDate: afterDate,
        searchBeforeDate: beforeDate,
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('min_id=');
      expect(params).toContain('max_id=');
      expect(params).not.toContain('null');
    });

    it('should construct search params with message content', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        searchMessageContent: 'test query',
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('content=test+query');
    });

    it('should construct search params with mentions', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        mentionIds: ['mention1', 'mention2'],
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('mentions=mention1');
      expect(params).toContain('mentions=mention2');
    });

    it('should construct search params with channel IDs', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        channelIds: ['channel1', 'channel2'],
      };

      const params = service._getSearchParams(testGuildId, null, searchCriteria);

      expect(params).toContain('channel_id=channel1');
      expect(params).toContain('channel_id=channel2');
    });

    it('should construct search params with has types', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        selectedHasTypes: ['image', 'video'],
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('has=image');
      expect(params).toContain('has=video');
    });

    it('should construct search params with pinned filter', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        isPinned: 'true',
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).toContain('pinned=true');
    });

    it('should remove null values from search params', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        searchAfterDate: null,
        searchBeforeDate: null,
        searchMessageContent: '',
      };

      const params = service._getSearchParams(testGuildId, testChannelId, searchCriteria);

      expect(params).not.toContain('null');
      expect(params).not.toContain('min_id');
      expect(params).not.toContain('max_id');
      expect(params).not.toContain('content=');
    });

    it('should construct search path for guild search', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        userIds: ['user1'],
      };

      const path = service._getSearchPath(testGuildId, null, 0, searchCriteria);

      expect(path).toContain(service.DISCORD_GUILDS_ENDPOINT);
      expect(path).toContain(testGuildId);
      expect(path).toContain('/messages/search');
    });

    it('should construct search path for channel search', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        userIds: ['user1'],
      };

      const path = service._getSearchPath(null, testChannelId, 0, searchCriteria);

      expect(path).toContain(service.DISCORD_CHANNELS_ENDPOINT);
      expect(path).toContain(testChannelId);
      expect(path).toContain('/messages/search');
    });

    it('should include offset in search path', () => {
      const searchCriteria: SearchCriteria = baseSearchCriteria;
      const offset = 25;

      const path = service._getSearchPath(testGuildId, null, offset, searchCriteria);

      expect(path).toContain(`offset=${offset}`);
    });

    it('should not include offset when 0', () => {
      const searchCriteria: SearchCriteria = baseSearchCriteria;

      const path = service._getSearchPath(testGuildId, null, 0, searchCriteria);

      expect(path).not.toContain('offset=');
    });

    it('should handle DM search correctly', () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        userIds: ['user1'],
      };

      const params = service._getSearchParams(null, testChannelId, searchCriteria);

      // For DM search, channel_id should be "null" and then removed
      expect(params).not.toContain('channel_id');
    });

    it('should execute search message data request', async () => {
      const searchCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        userIds: ['user1'],
      };
      const mockSearchResult = {
        messages: [[mockMessage]],
        total_results: 1,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockSearchResult));

      const result = await service.fetchSearchMessageData(
        testAuth,
        0,
        testChannelId,
        testGuildId,
        searchCriteria
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSearchResult);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('/messages/search'),
        expect.any(Object)
      );
    });
  });

  describe('iterateSearchResults', () => {
    const baseSearchCriteria: SearchCriteria = {
      userIds: [],
      mentionIds: [],
      selectedHasTypes: [],
      channelIds: [],
      searchMessageContent: null,
      searchAfterDate: null,
      searchBeforeDate: null,
      isPinned: 'null' as any,
    } as SearchCriteria;

    const makeMessage = (id: string, timestamp = '2025-01-01T00:00:00.000Z') => ({
      ...mockMessage,
      id,
      timestamp,
    });

    it('yields a partial first page and terminates after two consecutive empties', async () => {
      // Termination rule changed: per Discord's docs, "clients should not
      // rely on the length of the messages array to paginate." We now
      // terminate on two consecutive empty raw pages instead of `rawCount
      // < 25 == done`. So the mock must return the page once, then empty.
      const messages = [makeMessage('1'), makeMessage('2'), makeMessage('3')];
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () =>
            callCount === 1
              ? { messages: messages.map((m) => [m]), total_results: 3 }
              : { messages: [], total_results: 3 },
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // Three pages: the data page + two empty pages (terminator threshold).
      expect(pages).toHaveLength(3);
      expect(pages[0].messages.map((m: any) => m.id)).toEqual(['1', '2', '3']);
      expect(pages[0].totalResults).toBe(3);
      expect(pages[0].pageIndex).toBe(0);
      expect(pages[0].aggregatedCount).toBe(3);
      expect(pages[0].crossedQueryBoundary).toBe(false);
      expect(pages[1].messages).toEqual([]);
      expect(pages[2].messages).toEqual([]);
    });

    it('deduplicates across context-overlap', async () => {
      // Legacy behavior: Discord's response is `Message[][]` with each
      // inner array historically including ±2 context messages. Per the
      // current API docs surrounding context is no longer returned, but
      // the dedup Set is harmless and protects against any future
      // regression to context-bearing responses.
      const msgA = makeMessage('a');
      const msgB = makeMessage('b');
      const msgC = makeMessage('c');
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () =>
            callCount === 1
              ? {
                  messages: [
                    [msgA, msgB],
                    [msgB, msgC], // overlaps on msgB
                  ],
                  total_results: 3,
                }
              : { messages: [], total_results: 3 },
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      expect(pages[0].messages.map((m: any) => m.id)).toEqual(['a', 'b', 'c']);
      expect(pages[0].aggregatedCount).toBe(3);
    });

    it('continues with searchBeforeDate (max_id) when offset crosses 5000 cap', async () => {
      // Build 200 pages of 25 unique messages each (5000 total). After the
      // cap, the iterator must restart at offset=0 with `searchBeforeDate`
      // (max_id) tightened to the oldest seen — walking newest→oldest.
      // The continuation query then returns a small tail, followed by
      // empty pages to satisfy the new termination rule.
      const calls: any[] = [];
      let callNumber = 0;
      const mockFetch = vi.fn(async (url: string) => {
        calls.push(url);
        callNumber++;
        // First query: 200 full pages of 25 msgs (5000 total).
        if (callNumber <= 200) {
          const base = (callNumber - 1) * 25;
          // Older as callNumber grows, to match newest-first search order.
          const ts = new Date(Date.UTC(2025, 0, 1) - callNumber * 60_000).toISOString();
          const msgs = Array.from({ length: 25 }, (_, i) =>
            makeMessage(String(base + i), ts));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 5100 }),
          };
        }
        // Continuation query returns a small tail, then empties.
        if (callNumber === 201) {
          const tailTs = new Date(Date.UTC(2024, 0, 1)).toISOString();
          const msgs = Array.from({ length: 3 }, (_, i) =>
            makeMessage(`tail-${i}`, tailTs));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 3 }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 3 }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // 200 full pages + 1 continuation page + 2 empty terminators.
      expect(pages).toHaveLength(203);
      expect(pages[0].crossedQueryBoundary).toBe(false);
      expect(pages[199].crossedQueryBoundary).toBe(false);
      // Page 201 (index 200) is the first after the 5000-cap restart.
      expect(pages[200].crossedQueryBoundary).toBe(true);
      // The cap-shift URL has max_id (snowflake from the searchBeforeDate
      // boundary), NOT min_id — newest→oldest walk.
      const capShiftUrl = calls[200];
      expect(capShiftUrl).toContain('max_id=');
      expect(capShiftUrl).not.toContain('min_id=');
      expect(capShiftUrl).not.toContain('offset=');
      // Aggregated across both queries (5000 + 3 unique).
      expect(pages[200].aggregatedCount).toBe(5003);
    }, 10000);

    it('propagates thrown errors from failed fetches', async () => {
      vi.stubGlobal('fetch', mockFetchError(401));

      const run = async () => {
        for await (const _ of service.iterateSearchResults({
          token: testAuth,
          channelId: testChannelId,
          guildId: testGuildId,
          criteria: baseSearchCriteria,
        })) {
          // consume
        }
      };

      await expect(run()).rejects.toThrow(/Search request failed/);
    });

    it('stops early when shouldStop returns true before first request', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
        shouldStop: () => true,
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('stops when onBetweenPages returns true', async () => {
      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        const msgs = Array.from({ length: 25 }, (_, i) =>
          makeMessage(`${fetchCallCount}-${i}`));
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
        onBetweenPages: () => true, // stop after first page
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('yields empty first page when no results (so callers learn total=0)', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess({
        messages: [],
        total_results: 0,
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(pages[0].messages).toEqual([]);
      expect(pages[0].totalResults).toBe(0);
      expect(pages[0].aggregatedCount).toBe(0);
    });

    it('does NOT terminate on a single short page mid-walk (Discord docs: "do not rely on length")', async () => {
      // Discord may return fewer than 25 results due to index latency
      // even when more matches exist. The old `rawCount < 25 == done`
      // rule would terminate prematurely. The new rule requires two
      // consecutive empty pages.
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // Short page (6 results), but more matches exist per total_results.
          const msgs = Array.from({ length: 6 }, (_, i) => makeMessage(String(i)));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
          };
        }
        if (callCount === 2) {
          // Subsequent page also has data — iterator must keep walking.
          const msgs = Array.from({ length: 7 }, (_, i) => makeMessage(`b${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
          };
        }
        // Eventually empty.
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 100 }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // First two pages had data, then 2 consecutive empties to terminate.
      expect(pages.length).toBeGreaterThanOrEqual(4);
      expect(pages[0].messages).toHaveLength(6);
      expect(pages[1].messages).toHaveLength(7);
      // Did NOT terminate on the 6-result short page.
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('resets to offset=0 when total_results changes between pages (index reshuffle)', async () => {
      // total_results dropping signals that matches have shifted (e.g.
      // a mutating consumer just deleted some). Iterator restarts the
      // current query window at offset=0 to surface the new top.
      const calls: string[] = [];
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        calls.push(url);
        callCount++;
        if (callCount === 1) {
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`a${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
          };
        }
        if (callCount === 2) {
          // total_results dropped — signals reshuffle.
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`b${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 75 }),
          };
        }
        if (callCount === 3) {
          // After reset, iterator should be at offset=0 — verify URL.
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`c${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 75 }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 75 }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // Pages 1 and 2 advance offset normally (0, 25). Page 3 resets to
      // offset=0 because total_results shifted. Verify the URL carried
      // offset=0 OR no offset query param at all.
      const url3 = calls[2];
      expect(url3).not.toContain('offset=25');
      expect(url3).not.toContain('offset=50');
    });

    it('resets when an empty page lands at non-zero offset', async () => {
      // Walking past the last match → empty page at advanced offset.
      // Iterator should reset to offset=0 of the same query and check
      // the new top before terminating, in case results shifted.
      const calls: string[] = [];
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        calls.push(url);
        callCount++;
        if (callCount === 1) {
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`p1-${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 25 }),
          };
        }
        // Empty at offset=25 → triggers reset to offset=0.
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 25 }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // Reset after empty-at-non-zero → next URL is offset=0.
      const url3 = calls[2];
      expect(url3 && !url3.includes('offset=25') && !url3.includes('offset=50')).toBe(true);
    });

    it('handles 202 Accepted by sleeping retry_after and refetching', async () => {
      // Discord returns 202 when the entity isn't yet indexed.
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // 202 with retry_after: 0 → use short default delay.
          return {
            ok: true,
            status: 202,
            json: async () => ({ retry_after: 0 }),
          };
        }
        if (callCount === 2) {
          // Real response on retry.
          const msgs = Array.from({ length: 5 }, (_, i) => makeMessage(`r${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 5 }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 5 }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // Iterator retried after 202; first yielded page is the real data.
      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(pages[0].messages).toHaveLength(5);
    });

    it('terminates cleanly when cap-shift would drop max_id ≤ user-supplied min_id', async () => {
      // User specifies a lower bound (searchAfterDate). After hitting the
      // cap, the iterator's new searchBeforeDate boundary lands AT the
      // user's lower bound (oldest seen has the same timestamp as user's
      // lower bound) — the guard fires with `<=` and terminates instead
      // of issuing a search call against a collapsed window.
      const userLowerBound = new Date(Date.UTC(2025, 5, 1)); // June 1, 2025
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        // First query: 200 pages of 25 unique msgs (5000 total) all
        // timestamped at exactly the user's lower bound. After the cap,
        // the new max_id snowflake equals userLowerBoundSnowflake → guard
        // fires (`<=` comparison).
        if (callCount <= 200) {
          const base = (callCount - 1) * 25;
          const ts = userLowerBound.toISOString();
          const msgs = Array.from({ length: 25 }, (_, i) =>
            makeMessage(String(base + i), ts));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 5100 }),
          };
        }
        // Should never reach here — cap-shift guard should have terminated.
        throw new Error('Iterator did not terminate after lower-bound guard');
      }));

      const userCriteria: SearchCriteria = {
        ...baseSearchCriteria,
        searchAfterDate: userLowerBound,
      };

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: userCriteria,
      })) {
        pages.push(page);
      }

      // 200 pages, then guard terminates cleanly without a 201st call.
      expect(pages).toHaveLength(200);
      expect(callCount).toBe(200);
    }, 10000);

    it('does not terminate when total_results=0 but messages are populated (test-mock edge)', async () => {
      // Initial-empty fast path requires BOTH total_results=0 AND
      // pageMessages.length=0 to terminate. Some test mocks omit
      // total_results (defaults to 0) while populating messages —
      // the iterator must continue in that case, not terminate.
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // total_results omitted (→ 0) but messages populated.
          const msgs = Array.from({ length: 3 }, (_, i) => makeMessage(`m${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]) }),
          };
        }
        // Subsequent calls return empty so the standard 2-consecutive-
        // empties terminator kicks in.
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [] }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // First page yielded with 3 messages. Iterator did NOT terminate
      // on the initial-empty fast path despite total_results=0.
      expect(pages.length).toBeGreaterThanOrEqual(1);
      expect(pages[0].messages).toHaveLength(3);
      // Iterator continued past the data page to the empty terminator.
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('legacy onBetweenPages "reset" still resets offset (safety hatch)', async () => {
      // The wrapper no longer uses this hook (the iterator self-detects
      // via total_results), but we keep the API for tests + future
      // consumers. Verify a manual 'reset' return still flips offset
      // to 0 mid-walk.
      const calls: string[] = [];
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        calls.push(url);
        callCount++;
        if (callCount === 1) {
          // First page: 25 results so offset would advance to 25.
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`a${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 50 }),
          };
        }
        // After the manual 'reset', offset should be 0 again — verify
        // by URL inspection.
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 50 }),
        };
      }));

      let resetSent = false;
      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
        onBetweenPages: () => {
          if (!resetSent) {
            resetSent = true;
            return 'reset';
          }
          return false;
        },
      })) {
        pages.push(page);
      }

      // After the explicit 'reset', the second URL must NOT carry an
      // advanced offset (=25). It should be at offset 0 (or no offset
      // qs param, which means 0).
      const url2 = calls[1];
      expect(url2 && !url2.includes('offset=25')).toBe(true);
    });

    it('consecutive-empty counter resets on a non-empty page (no premature termination)', async () => {
      // Sequence: empty → empty would terminate at threshold=2. But if
      // a non-empty page lands between them, the counter resets and the
      // iterator continues. Verify we get all data even when empties
      // are interleaved with progress.
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          const msgs = Array.from({ length: 25 }, (_, i) => makeMessage(`a${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
          };
        }
        if (callCount === 2) {
          // Empty page → consecutiveEmpty=1 (not terminator)
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: [], total_results: 100 }),
          };
        }
        if (callCount === 3) {
          // Non-empty page → counter MUST reset to 0
          const msgs = Array.from({ length: 5 }, (_, i) => makeMessage(`b${i}`));
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: msgs.map((m) => [m]), total_results: 100 }),
          };
        }
        if (callCount === 4) {
          // Empty again — consecutiveEmpty=1 (counter was reset by
          // call 3, so this is NOT the second consecutive empty)
          return {
            ok: true,
            status: 200,
            json: async () => ({ messages: [], total_results: 100 }),
          };
        }
        // call 5: empty → consecutiveEmpty=2 → terminate
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [], total_results: 100 }),
        };
      }));

      const pages: any[] = [];
      for await (const page of service.iterateSearchResults({
        token: testAuth,
        channelId: testChannelId,
        guildId: testGuildId,
        criteria: baseSearchCriteria,
      })) {
        pages.push(page);
      }

      // Both data pages were yielded → the empty between them did NOT
      // prematurely terminate. Counter reset on the non-empty page,
      // then 2 consecutive empties at the end terminated.
      const dataPages = pages.filter((p) => p.messages.length > 0);
      expect(dataPages).toHaveLength(2);
      expect(dataPages[0].messages).toHaveLength(25);
      expect(dataPages[1].messages).toHaveLength(5);
    });
  });

  describe('Snowflake Generation', () => {
    it('should generate snowflake from date', () => {
      const testDate = new Date('2023-06-15T12:00:00.000Z');
      const snowflake = service.generateSnowflake(testDate);

      expect(snowflake).toBeTruthy();
      expect(typeof snowflake).toBe('string');
      expect(snowflake.length).toBeGreaterThan(0);
    });

    it('should generate snowflake from current date when no date provided', () => {
      const snowflake = service.generateSnowflake();

      expect(snowflake).toBeTruthy();
      expect(typeof snowflake).toBe('string');
    });

    it('should generate different snowflakes for different dates', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-12-31');

      const snowflake1 = service.generateSnowflake(date1);
      const snowflake2 = service.generateSnowflake(date2);

      expect(snowflake1).not.toBe(snowflake2);
    });

    it('should generate consistent snowflake for same date', () => {
      const testDate = new Date('2023-06-15T12:00:00.000Z');

      const snowflake1 = service.generateSnowflake(testDate);
      const snowflake2 = service.generateSnowflake(testDate);

      expect(snowflake1).toBe(snowflake2);
    });
  });

  describe('Thread Operations', () => {
    it('should fetch private threads', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchPrivateThreads(testAuth, testChannelId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThreadsResponse);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('/threads/archived/private'),
        expect.any(Object)
      );
    });

    it('should fetch public threads', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchPublicThreads(testAuth, testChannelId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThreadsResponse);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('/threads/archived/public'),
        expect.any(Object)
      );
    });

    it('should fetch public threads with before param', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchPublicThreads(testAuth, testChannelId, '2023-01-01T00:00:00.000000+00:00');

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('?before=2023-01-01T00:00:00.000000+00:00'),
        expect.any(Object)
      );
    });

    it('should fetch active guild threads', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchActiveGuildThreads(testAuth, testGuildId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThreadsResponse);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`/guilds/${testGuildId}/threads/active`),
        expect.any(Object)
      );
    });

    it('should fetch joined private archived threads', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchJoinedPrivateArchivedThreads(testAuth, testChannelId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThreadsResponse);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`/channels/${testChannelId}/users/@me/threads/archived/private`),
        expect.any(Object)
      );
    });

    it('should fetch joined private archived threads with before param', async () => {
      const mockThreadsResponse = {
        threads: [mockTextChannel],
        members: [],
        has_more: false,
      };
      vi.stubGlobal('fetch', mockFetchSuccess(mockThreadsResponse));

      const result = await service.fetchJoinedPrivateArchivedThreads(testAuth, testChannelId, '2023-01-01T00:00:00.000000+00:00');

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('?before=2023-01-01T00:00:00.000000+00:00'),
        expect.any(Object)
      );
    });
  });

  describe('Reaction Operations', () => {
    it('should get reactions for emoji', async () => {
      const mockUsers = [mockUser];
      vi.stubGlobal('fetch', mockFetchSuccess(mockUsers));

      const result = await service.getReactions(
        testAuth,
        testChannelId,
        testMessageId,
        '👍',
        ReactionType.NORMAL
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('/reactions/👍'),
        expect.any(Object)
      );
    });

    it('should get reactions with pagination', async () => {
      const mockUsers = [mockUser];
      vi.stubGlobal('fetch', mockFetchSuccess(mockUsers));

      await service.getReactions(
        testAuth,
        testChannelId,
        testMessageId,
        '👍',
        ReactionType.NORMAL,
        'lastUserId'
      );

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining('after=lastUserId'),
        expect.any(Object)
      );
    });

    it('should delete reaction', async () => {
      vi.stubGlobal('fetch', mockFetchSuccess(undefined));

      const result = await service.deleteReaction(
        testAuth,
        testChannelId,
        testMessageId,
        '👍',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining(`/reactions/👍/${testUserId}`),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('File Download', () => {
    it('should download file from URL', async () => {
      const mockBlob = new Blob(['test data'], { type: 'image/png' });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.downloadFile('https://cdn.discord.com/test.png');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBlob);
    });

    it('should apply search delay to file download', async () => {
      const settings: AppSettings = {
        searchDelay2: 0.1,
        deleteDelay2: 0,
        delayModifier2: 0,
      } as AppSettings;
      const delayedService = new DiscordService(settings);
      const mockBlob = new Blob(['test data']);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      }));

      const startTime = Date.now();
      await delayedService.downloadFile('https://cdn.discord.com/test.png');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Request threw an exception',
        expect.any(Error)
      );
    });

    it('should handle non-200 non-429 errors with status code', async () => {
      vi.stubGlobal('fetch', mockFetchError(403, 'Forbidden'));

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(console.error).toHaveBeenCalledWith(
        'Request could not be completed',
        expect.any(Object)
      );
    });

    it('should handle 401 unauthorized with status code', async () => {
      vi.stubGlobal('fetch', mockFetchError(401, 'Unauthorized'));

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });

    it('should handle 404 not found with status code', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Not Found'));

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should handle 500 server error with status code', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Internal Server Error'));

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
    });

    it('should handle malformed JSON responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.getUser(testAuth, testUserId);

      expect(result.success).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should calculate random number within range', () => {
      const min = 5;
      const max = 10;
      const results: number[] = [];

      for (let i = 0; i < 100; i++) {
        const result = service.calculateRandomNumber(max, min);
        results.push(result);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
      }

      // Verify randomness - should have variety
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(50);
    });

    it('should calculate random number with default min of 0', () => {
      const max = 10;

      for (let i = 0; i < 50; i++) {
        const result = service.calculateRandomNumber(max);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(max);
      }
    });
  });
});
