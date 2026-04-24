import { describe, it, expect } from 'vitest';
import {
  OFFSET_INCREMENT,
  MAX_OFFSET,
  START_OFFSET,
  getNextSearchData,
  getNextSearchStatus,
  isMessageTypeAllowed,
  isSearchComplete,
  isGuildForum,
  isDm,
  isCriteriaActive,
  getEncodedEmoji,
  getUserMappingData,
  getGMOMappingData,
  getThreadEntityName,
  getThreadsFromMessages,
  extractMentionedUserIds,
  isUserDataStale,
  defaultGMOMappingData,
} from './utils.ts';
import type { Message, Channel, User, GuildMemberObject } from '../types/discord-types.ts';
import type { SearchCriteria } from '../types/discrub-types.ts';
import { MessageType, IsPinnedType } from '../enum/discord-enum.ts';

describe('messages/utils', () => {
  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(OFFSET_INCREMENT).toBe(25);
      expect(MAX_OFFSET).toBe(5000);
      expect(START_OFFSET).toBe(0);
    });
  });

  describe('getNextSearchData', () => {
    const createMessage = (timestamp: string): Message => ({
      id: '1',
      channel_id: 'channel-1',
      content: 'Test',
      timestamp,
      type: 0,
      author: { id: 'user-1', username: 'test', discriminator: '0001' },
      attachments: [],
      embeds: [],
    } as Message);

    const baseCriteria: SearchCriteria = {
      searchMessageContent: 'test',
    };

    it('should increment offset by OFFSET_INCREMENT', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, 0, 100, false, baseCriteria);

      expect(result.offset).toBe(25);
      expect(result.isEndConditionMet).toBe(false);
    });

    it('should reset offset when reaching MAX_OFFSET', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, MAX_OFFSET, 10000, false, baseCriteria);

      expect(result.offset).toBe(START_OFFSET);
      expect(result.searchCriteria.searchBeforeDate).toBeDefined();
    });

    it('should set isEndConditionMet when already true', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, 0, 100, true, baseCriteria);

      expect(result.isEndConditionMet).toBe(true);
    });

    it('should set isEndConditionMet when reaching endOffset', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, 75, 100, false, baseCriteria, 100);

      expect(result.isEndConditionMet).toBe(true);
    });

    it('should set isEndConditionMet when reaching all results', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, 75, 100, false, baseCriteria);

      expect(result.isEndConditionMet).toBe(true);
    });

    it('should reset offset when all results found', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, 75, 100, false, baseCriteria);

      expect(result.offset).toBe(START_OFFSET);
    });

    it('should preserve search criteria when not at MAX_OFFSET', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const criteria = { ...baseCriteria, searchMessageContent: 'specific' };
      const result = getNextSearchData(message, 0, 100, false, criteria);

      expect(result.searchCriteria).toEqual(criteria);
    });

    it('should update searchBeforeDate when at MAX_OFFSET', () => {
      const message = createMessage('2024-01-15T12:00:00Z');
      const result = getNextSearchData(message, MAX_OFFSET, 10000, false, baseCriteria);

      expect(result.searchCriteria.searchBeforeDate).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('getNextSearchStatus', () => {
    it('should return thread count for guild forum', () => {
      const channel: Channel = { id: '1', type: 15 } as Channel;
      const threads: Channel[] = [
        { id: 't1' } as Channel,
        { id: 't2' } as Channel,
      ];

      const result = getNextSearchStatus(threads, [], 0, channel);

      expect(result).toBe('Retrieved 2 threads');
    });

    it('should return message count for non-forum channel', () => {
      const channel: Channel = { id: '1', type: 0 } as Channel;
      const messages: Message[] = [
        { id: 'm1' } as Message,
        { id: 'm2' } as Message,
        { id: 'm3' } as Message,
      ];

      const result = getNextSearchStatus([], messages, 100, channel);

      expect(result).toBe('Retrieved 3 of 100 search results');
    });

    it('should work without channel parameter', () => {
      const messages: Message[] = [{ id: 'm1' } as Message];

      const result = getNextSearchStatus([], messages, 50);

      expect(result).toBe('Retrieved 1 of 50 search results');
    });
  });

  describe('isMessageTypeAllowed', () => {
    it('should allow DEFAULT messages', () => {
      expect(isMessageTypeAllowed(MessageType.DEFAULT)).toBe(true);
    });

    it('should allow REPLY messages', () => {
      expect(isMessageTypeAllowed(MessageType.REPLY)).toBe(true);
    });

    it('should allow CHAT_INPUT_COMMAND', () => {
      expect(isMessageTypeAllowed(MessageType.CHAT_INPUT_COMMAND)).toBe(true);
    });

    it('should allow guild boost messages', () => {
      expect(isMessageTypeAllowed(MessageType.GUILD_BOOST)).toBe(true);
      expect(isMessageTypeAllowed(MessageType.GUILD_BOOST_TIER_1)).toBe(true);
      expect(isMessageTypeAllowed(MessageType.GUILD_BOOST_TIER_2)).toBe(true);
      expect(isMessageTypeAllowed(MessageType.GUILD_BOOST_TIER_3)).toBe(true);
    });

    it('should allow THREAD_CREATED', () => {
      expect(isMessageTypeAllowed(MessageType.THREAD_CREATED)).toBe(true);
    });

    it('should allow CALL messages', () => {
      expect(isMessageTypeAllowed(MessageType.CALL)).toBe(true);
    });

    it('should not allow unknown message types', () => {
      expect(isMessageTypeAllowed(999)).toBe(false);
    });
  });

  describe('isSearchComplete', () => {
    it('should return true when offset >= total', () => {
      expect(isSearchComplete(100, 100)).toBe(true);
      expect(isSearchComplete(150, 100)).toBe(true);
    });

    it('should return false when offset < total', () => {
      expect(isSearchComplete(50, 100)).toBe(false);
      expect(isSearchComplete(0, 100)).toBe(false);
    });

    it('should handle zero values', () => {
      expect(isSearchComplete(0, 0)).toBe(true);
    });
  });

  describe('isGuildForum', () => {
    it('should return true for GUILD_FORUM type (15)', () => {
      const channel: Channel = { id: '1', type: 15 } as Channel;
      expect(isGuildForum(channel)).toBe(true);
    });

    it('should return false for non-forum channels', () => {
      const channel: Channel = { id: '1', type: 0 } as Channel;
      expect(isGuildForum(channel)).toBe(false);
    });

    it('should return false for undefined channel', () => {
      expect(isGuildForum(undefined)).toBe(false);
    });
  });

  describe('isDm', () => {
    it('should return true for DM type (1)', () => {
      const channel: Channel = { id: '1', type: 1 } as Channel;
      expect(isDm(channel)).toBe(true);
    });

    it('should return true for GROUP_DM type (3)', () => {
      const channel: Channel = { id: '1', type: 3 } as Channel;
      expect(isDm(channel)).toBe(true);
    });

    it('should return false for guild text channel (0)', () => {
      const channel: Channel = { id: '1', type: 0 } as Channel;
      expect(isDm(channel)).toBe(false);
    });

    it('should return false for other channel types', () => {
      const channel: Channel = { id: '1', type: 2 } as Channel;
      expect(isDm(channel)).toBe(false);
    });
  });

  describe('isCriteriaActive', () => {
    it('should return true when searchMessageContent is set', () => {
      const criteria: SearchCriteria = { searchMessageContent: 'test' };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when userIds is set', () => {
      const criteria: SearchCriteria = { userIds: ['user1', 'user2'] };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when mentionIds is set', () => {
      const criteria: SearchCriteria = { mentionIds: ['user1'] };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when channelIds is set', () => {
      const criteria: SearchCriteria = { channelIds: ['channel1'] };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when selectedHasTypes is set', () => {
      const criteria: SearchCriteria = { selectedHasTypes: ['link'] };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when searchBeforeDate is set', () => {
      const criteria: SearchCriteria = { searchBeforeDate: new Date() };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when searchAfterDate is set', () => {
      const criteria: SearchCriteria = { searchAfterDate: new Date() };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return true when isPinned is set to non-UNSET value', () => {
      const criteria: SearchCriteria = { isPinned: 1 as IsPinnedType };
      expect(isCriteriaActive(criteria)).toBe(true);
    });

    it('should return false when isPinned is UNSET', () => {
      const criteria: SearchCriteria = { isPinned: IsPinnedType.UNSET };
      expect(isCriteriaActive(criteria)).toBe(false);
    });

    it('should return false when no criteria is set', () => {
      const criteria: SearchCriteria = {};
      expect(isCriteriaActive(criteria)).toBe(false);
    });

    it('should return false for empty arrays', () => {
      const criteria: SearchCriteria = {
        userIds: [],
        mentionIds: [],
        channelIds: [],
        selectedHasTypes: [],
      };
      expect(isCriteriaActive(criteria)).toBe(false);
    });
  });

  describe('getEncodedEmoji', () => {
    it('should return encoded emoji with id', () => {
      const emoji = { id: '123', name: 'smile' };
      expect(getEncodedEmoji(emoji)).toBe('smile:123');
    });

    it('should return name for unicode emoji (no id)', () => {
      const emoji = { id: null, name: '😀' };
      expect(getEncodedEmoji(emoji)).toBe('😀');
    });

    it('should return null when name is missing', () => {
      const emoji = { id: '123', name: null };
      expect(getEncodedEmoji(emoji)).toBe(null);
    });

    it('should return null when name is undefined', () => {
      const emoji = { id: '123', name: undefined };
      expect(getEncodedEmoji(emoji)).toBe(null);
    });
  });

  describe('getUserMappingData', () => {
    it('should extract user mapping data', () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        discriminator: '0001',
        global_name: 'Test User',
        avatar: 'avatar-hash',
      } as User;

      const result = getUserMappingData(user);

      expect(result.userName).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.avatar).toBe('avatar-hash');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle null global_name', () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        discriminator: '0001',
        global_name: null,
        avatar: 'avatar-hash',
      } as User;

      const result = getUserMappingData(user);

      expect(result.displayName).toBe(null);
    });

    it('should handle null avatar', () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        discriminator: '0001',
        avatar: null,
      } as User;

      const result = getUserMappingData(user);

      expect(result.avatar).toBe(null);
    });
  });

  describe('getGMOMappingData', () => {
    it('should extract guild member mapping data', () => {
      const member: GuildMemberObject = {
        user: { id: 'user-1', username: 'test', discriminator: '0001' } as User,
        roles: ['role1', 'role2'],
        nick: 'Nickname',
        joined_at: '2024-01-15T12:00:00Z',
      } as GuildMemberObject;

      const result = getGMOMappingData(member);

      expect(result.roles).toEqual(['role1', 'role2']);
      expect(result.nick).toBe('Nickname');
      expect(result.joinedAt).toBe('2024-01-15T12:00:00Z');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle empty roles', () => {
      const member: GuildMemberObject = {
        user: { id: 'user-1', username: 'test', discriminator: '0001' } as User,
        roles: [],
        joined_at: '2024-01-15T12:00:00Z',
      } as GuildMemberObject;

      const result = getGMOMappingData(member);

      expect(result.roles).toEqual([]);
    });

    it('should handle null nick', () => {
      const member: GuildMemberObject = {
        user: { id: 'user-1', username: 'test', discriminator: '0001' } as User,
        roles: ['role1'],
        nick: null,
        joined_at: '2024-01-15T12:00:00Z',
      } as GuildMemberObject;

      const result = getGMOMappingData(member);

      expect(result.nick).toBe(null);
    });
  });

  describe('getThreadEntityName', () => {
    it('should return thread name', () => {
      const thread: Channel = { id: 'thread-1', name: 'Test Thread' } as Channel;
      expect(getThreadEntityName(thread)).toBe('Test Thread');
    });

    it('should return thread id when name is missing', () => {
      const thread: Channel = { id: 'thread-1' } as Channel;
      expect(getThreadEntityName(thread)).toBe('thread-1');
    });

    it('should return thread id when name is null', () => {
      const thread: Channel = { id: 'thread-1', name: null } as Channel;
      expect(getThreadEntityName(thread)).toBe('thread-1');
    });
  });

  describe('getThreadsFromMessages', () => {
    it('should extract new threads from messages', () => {
      const messages: Message[] = [
        {
          id: 'm1',
          thread: { id: 'thread-1', name: 'Thread 1' } as Channel,
        } as Message,
        {
          id: 'm2',
          thread: { id: 'thread-2', name: 'Thread 2' } as Channel,
        } as Message,
      ];
      const knownThreads: Channel[] = [];

      const result = getThreadsFromMessages(messages, knownThreads);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('thread-1');
      expect(result[1].id).toBe('thread-2');
    });

    it('should not include already known threads', () => {
      const messages: Message[] = [
        {
          id: 'm1',
          thread: { id: 'thread-1', name: 'Thread 1' } as Channel,
        } as Message,
        {
          id: 'm2',
          thread: { id: 'thread-2', name: 'Thread 2' } as Channel,
        } as Message,
      ];
      const knownThreads: Channel[] = [
        { id: 'thread-1' } as Channel,
      ];

      const result = getThreadsFromMessages(messages, knownThreads);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('thread-2');
    });

    it('should handle messages without threads', () => {
      const messages: Message[] = [
        { id: 'm1' } as Message,
        { id: 'm2' } as Message,
      ];
      const knownThreads: Channel[] = [];

      const result = getThreadsFromMessages(messages, knownThreads);

      expect(result).toHaveLength(0);
    });

    it('should handle duplicate threads in messages (does not deduplicate)', () => {
      const messages: Message[] = [
        {
          id: 'm1',
          thread: { id: 'thread-1', name: 'Thread 1' } as Channel,
        } as Message,
        {
          id: 'm2',
          thread: { id: 'thread-1', name: 'Thread 1' } as Channel,
        } as Message,
      ];
      const knownThreads: Channel[] = [];

      const result = getThreadsFromMessages(messages, knownThreads);

      // Function does not deduplicate, so it returns 2 thread references
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('thread-1');
      expect(result[1].id).toBe('thread-1');
    });
  });

  describe('extractMentionedUserIds', () => {
    it('should extract user mentions', () => {
      const content = 'Hello <@123> and <@456>!';
      const result = extractMentionedUserIds(content);

      expect(result).toEqual(['123', '456']);
    });

    it('should extract mentions with ! prefix', () => {
      const content = 'Hey <@!789>!';
      const result = extractMentionedUserIds(content);

      expect(result).toEqual(['789']);
    });

    it('should handle multiple mentions', () => {
      const content = '<@111> <@222> <@!333> test <@444>';
      const result = extractMentionedUserIds(content);

      expect(result).toEqual(['111', '222', '333', '444']);
    });

    it('should return empty array for no mentions', () => {
      const content = 'No mentions here';
      const result = extractMentionedUserIds(content);

      expect(result).toEqual([]);
    });

    it('should handle empty content', () => {
      const content = '';
      const result = extractMentionedUserIds(content);

      expect(result).toEqual([]);
    });
  });

  describe('isUserDataStale', () => {
    it('should return true when timestamp is undefined', () => {
      expect(isUserDataStale(undefined, 24)).toBe(true);
    });

    it('should return true when data is older than refresh rate', () => {
      const oneDayAgo = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      expect(isUserDataStale(oneDayAgo, 24)).toBe(true);
    });

    it('should return false when data is newer than refresh rate', () => {
      const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      expect(isUserDataStale(oneHourAgo, 24)).toBe(false);
    });

    it('should return false when data is exactly at refresh rate threshold', () => {
      const exactlyAtThreshold = Date.now() - (24 * 60 * 60 * 1000); // exactly 24 hours ago
      expect(isUserDataStale(exactlyAtThreshold, 24)).toBe(false);
    });

    it('should handle different refresh rates', () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      expect(isUserDataStale(twoHoursAgo, 1)).toBe(true);
      expect(isUserDataStale(twoHoursAgo, 3)).toBe(false);
    });
  });

  describe('defaultGMOMappingData', () => {
    it('should have correct default values', () => {
      expect(defaultGMOMappingData.roles).toEqual([]);
      expect(defaultGMOMappingData.nick).toBe(null);
      expect(defaultGMOMappingData.joinedAt).toBe(null);
      expect(defaultGMOMappingData.timestamp).toBeGreaterThan(0);
    });
  });
});
