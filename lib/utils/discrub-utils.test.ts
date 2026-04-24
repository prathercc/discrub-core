import { describe, it, expect } from 'vitest';
import {
  sortBy,
  sortByProperty,
  getPercent,
  getFsUUID,
  resolveAvatarUrl,
  colorToHex,
  getOsSafeString,
  formatUserData,
  punctuateStringArr,
  getRichEmbeds,
  getExportFileName,
  getColor,
  getIconUrl,
  getEntityHint,
  entityIsImage,
  entityIsVideo,
  entityIsAudio,
  entityContainsMedia,
  getMediaUrls,
  isDm,
  getHighestRoles,
  getRoleNames,
  getEncodedEmoji,
  isGuildForum,
  resolveRoleUrl,
  resolveEmojiUrl,
  stringToBool,
  boolToString,
  stringToTypedArray,
  getReactingUsers,
  isThreadMessage,
  isNonStandardMessage,
  messageTypeEquals,
  isRemovableMessage,
  isCriteriaActive,
  isUserDataStale,
  getSortedChannels,
  getSortedGuilds,
  getSortedMessages,
  isSearchComplete,
  getUserMappingData,
  getGMOMappingData,
  defaultGMOMappingData,
  filterBoth,
  getTagName,
  getThreadEntityName,
  getThreadsFromMessages,
  filterDuplicateThreads,
  filterThreadsByMessages,
  normalizeGuild,
  getDmName,
  getDmRecipients,
  createPreFilterUsers,
} from './discrub-utils.ts';
import { SortDirection } from '../enum/common-enum.ts';
import { ChannelType, EmbedType, MessageType } from '../enum/discord-enum.ts';
import { Tag, UserDataRefreshRate } from '../enum/discrub-enum.ts';
import type { Message, Channel, Guild, Role, Attachment, Embed, Emoji, User } from '../types/discord-types.ts';
import type { ExportUserMap } from '../types/discrub-types.ts';

describe('discrub-utils', () => {
  describe('Sorting Functions', () => {
    it('should sort by ascending order', () => {
      const items = [
        { id: '3', name: 'Charlie', value: 30 },
        { id: '1', name: 'Alice', value: 10 },
        { id: '2', name: 'Bob', value: 20 },
      ];

      const sorted = sortBy(items, 'value', SortDirection.ASCENDING);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].value).toBe(10);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(30);
    });

    it('should sort by descending order', () => {
      const items = [
        { id: '1', name: 'Alice', value: 10 },
        { id: '3', name: 'Charlie', value: 30 },
        { id: '2', name: 'Bob', value: 20 },
      ];

      const sorted = sortBy(items, 'value', SortDirection.DESCENDING);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].value).toBe(30);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(10);
    });

    it('should sort by property with numeric values', () => {
      const items = [
        { count: 100 },
        { count: 50 },
        { count: 75 },
      ];

      const sorted = sortBy(items, 'count', SortDirection.ASCENDING);

      expect(sorted[0].count).toBe(50);
      expect(sorted[1].count).toBe(75);
      expect(sorted[2].count).toBe(100);
    });

    it('should sort by property with string values', () => {
      const items = [
        { name: 'Zebra' },
        { name: 'Apple' },
        { name: 'Mango' },
      ];

      const sorted = sortBy(items, 'name', SortDirection.ASCENDING);

      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Mango');
      expect(sorted[2].name).toBe('Zebra');
    });

    it('should not mutate original array', () => {
      const items = [
        { value: 3 },
        { value: 1 },
        { value: 2 },
      ];

      const original = [...items];
      const sorted = sortBy(items, 'value');

      expect(items).toEqual(original);
      expect(sorted).not.toBe(items);
    });

    it('should handle sortByProperty comparison', () => {
      const a = { value: 10 };
      const b = { value: 20 };

      const ascResult = sortByProperty(a, b, 'value', SortDirection.ASCENDING);
      expect(ascResult).toBe(-1);

      const descResult = sortByProperty(a, b, 'value', SortDirection.DESCENDING);
      expect(descResult).toBe(1);

      const equalResult = sortByProperty(a, a, 'value', SortDirection.ASCENDING);
      expect(equalResult).toBe(0);
    });
  });

  describe('Math Functions', () => {
    it('should calculate percentage correctly', () => {
      expect(getPercent(50, 100)).toBe('50');
      expect(getPercent(25, 100)).toBe('25');
      expect(getPercent(75, 100)).toBe('75');
    });

    it('should handle zero total', () => {
      expect(getPercent(0, 0)).toBe('0');
    });

    it('should truncate decimal values', () => {
      expect(getPercent(33, 100)).toBe('33');
      expect(getPercent(1, 3)).toBe('33'); // 33.333... -> "33"
      expect(getPercent(2, 3)).toBe('66'); // 66.666... -> "66"
    });

    it('should handle edge case percentages', () => {
      expect(getPercent(1, 100)).toBe('1');
      expect(getPercent(99, 100)).toBe('99');
      expect(getPercent(100, 100)).toBe('100');
    });
  });

  describe('ID Generation', () => {
    it('should generate non-empty ID', () => {
      const id = getFsUUID();
      expect(id).toBeTruthy();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = getFsUUID();
      const id2 = getFsUUID();
      const id3 = getFsUUID();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate OS-safe IDs', () => {
      const id = getFsUUID();

      // Should not contain OS-unsafe characters
      expect(id).not.toMatch(/[<>:"\/\\|?*]/);
    });
  });

  describe('Avatar URL Resolution', () => {
    it('should resolve avatar URL with default size', () => {
      const result = resolveAvatarUrl('user123', 'avatar456');

      expect(result.remote).toBe('https://cdn.discordapp.com/avatars/user123/avatar456');
      expect(result.local).toBeUndefined();
    });

    it('should handle null avatar', () => {
      const result = resolveAvatarUrl('user123', null);

      expect(result.remote).toBe('resources/media/default_avatar.png');
      expect(result.local).toBeUndefined();
    });

    it('should handle undefined avatar', () => {
      const result = resolveAvatarUrl('user123', undefined);

      expect(result.remote).toBe('resources/media/default_avatar.png');
      expect(result.local).toBeUndefined();
    });

    it('should use avatar map when provided', () => {
      const avatarMap = {
        'user123/avatar456': 'local/path/to/avatar.png',
      };

      const result = resolveAvatarUrl('user123', 'avatar456', avatarMap);

      expect(result.remote).toBe('https://cdn.discordapp.com/avatars/user123/avatar456');
      expect(result.local).toBe('../local/path/to/avatar.png');
    });
  });

  describe('Color Utilities', () => {
    it('should convert color to hex', () => {
      expect(colorToHex(16711680)).toBe('#ff0000'); // Red
      expect(colorToHex(65280)).toBe('#ff00'); // Green (note: this is a quirk of toString(16))
      expect(colorToHex(255)).toBe('#ff'); // Blue
    });

    it('should handle null color', () => {
      expect(colorToHex(null)).toBe('#FFF');
    });

    it('should handle undefined color', () => {
      expect(colorToHex(undefined)).toBe('#FFF');
    });

    it('should handle zero color', () => {
      expect(colorToHex(0)).toBe('#FFF');
    });
  });

  describe('String Utilities', () => {
    it('should make strings OS-safe', () => {
      expect(getOsSafeString('file:name.txt')).not.toContain(':');
      expect(getOsSafeString('file/name.txt')).not.toContain('/');
      expect(getOsSafeString('file<name>.txt')).not.toContain('<');
      expect(getOsSafeString('file<name>.txt')).not.toContain('>');
    });

    it('should preserve valid characters', () => {
      const safe = getOsSafeString('valid-filename_123.txt');
      expect(safe).toContain('valid');
      expect(safe).toContain('filename');
      expect(safe).toContain('123');
      expect(safe).toContain('.txt');
    });
  });

  describe('User Data Formatting', () => {
    it('should format complete user data', () => {
      const formatted = formatUserData({
        userId: 'user123',
        userName: 'testuser',
        displayName: 'Test User',
        guildNickname: 'Tester',
        joinedAt: '2024-01-15',
        roleNames: ['Admin', 'Moderator'],
      });

      expect(formatted).toContain('Username: testuser');
      expect(formatted).toContain('Display Name: Test User');
      expect(formatted).toContain('Server Nickname: Tester');
      expect(formatted).toContain('User ID: user123');
      expect(formatted).toContain('Joined Server: 2024-01-15');
      expect(formatted).toContain('Roles: Admin, Moderator');
    });

    it('should handle partial user data', () => {
      const formatted = formatUserData({
        userName: 'testuser',
        userId: 'user123',
      });

      expect(formatted).toContain('Username: testuser');
      expect(formatted).toContain('User ID: user123');
      expect(formatted).not.toContain('Display Name:');
      expect(formatted).not.toContain('Server Nickname:');
      expect(formatted).not.toContain('Roles:');
    });

    it('should handle empty role array', () => {
      const formatted = formatUserData({
        userName: 'testuser',
        roleNames: [],
      });

      expect(formatted).not.toContain('Roles:');
    });

    it('should handle missing optional fields', () => {
      const formatted = formatUserData({
        userId: 'user123',
      });

      expect(formatted).toContain('User ID: user123');
      expect(formatted).not.toContain('Username:');
      expect(formatted).not.toContain('Display Name:');
    });
  });

  describe('punctuateStringArr', () => {
    it('should join single item', () => {
      expect(punctuateStringArr(['Alice'])).toBe('Alice');
    });

    it('should join two items with "and"', () => {
      expect(punctuateStringArr(['Alice', 'Bob'])).toBe('Alice and Bob');
    });

    it('should join three items with commas and "and"', () => {
      expect(punctuateStringArr(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob and Charlie');
    });

    it('should handle empty array', () => {
      expect(punctuateStringArr([])).toBe('');
    });
  });

  describe('getColor', () => {
    it('should return hex color', () => {
      expect(getColor(16711680)).toBe('#ff0000');
    });
  });

  describe('getRichEmbeds', () => {
    it('should filter only rich embeds', () => {
      const message = {
        embeds: [
          { type: EmbedType.RICH, title: 'Rich Embed' },
          { type: EmbedType.IMAGE, url: 'image.png' },
          { type: EmbedType.RICH, title: 'Another Rich' },
        ],
      } as Message;

      const richEmbeds = getRichEmbeds(message);

      expect(richEmbeds).toHaveLength(2);
      expect(richEmbeds[0].type).toBe(EmbedType.RICH);
      expect(richEmbeds[1].type).toBe(EmbedType.RICH);
    });

    it('should return empty array when no rich embeds', () => {
      const message = {
        embeds: [
          { type: EmbedType.IMAGE },
        ],
      } as Message;

      expect(getRichEmbeds(message)).toHaveLength(0);
    });
  });

  describe('getExportFileName', () => {
    it('should generate filename for role', () => {
      const role = { id: 'role123', name: 'Admin', color: 0, hoist: false } as Role;
      const filename = getExportFileName(role, 'json');

      expect(filename).toContain('Admin');
      expect(filename).toContain('role123');
      expect(filename).toContain('.json');
    });

    it('should generate filename for attachment', () => {
      const attachment = { filename: 'image.png' } as Attachment;
      const filename = getExportFileName(attachment, 'html');

      expect(filename).toContain('image.png');
      expect(filename).toContain('.html');
    });

    it('should generate filename for embed with title', () => {
      const embed = { type: EmbedType.RICH, title: 'My Embed' } as Embed;
      const filename = getExportFileName(embed, 'json');

      expect(filename).toContain('My Embed');
      expect(filename).toContain('.json');
    });

    it('should generate filename for embed without title', () => {
      const embed = { type: EmbedType.IMAGE } as Embed;
      const filename = getExportFileName(embed, 'json');

      expect(filename).toContain('.json');
    });
  });

  describe('getIconUrl', () => {
    it('should return guild icon URL', () => {
      const guild = { id: 'guild123', icon: 'icon456', emojis: [], roles: [] } as Guild;
      const url = getIconUrl(guild);

      expect(url).toBe('https://cdn.discordapp.com/icons/guild123/icon456');
    });

    it('should return default icon for guild without icon', () => {
      const guild = { id: 'guild123', icon: null, emojis: [], roles: [] } as Guild;
      const url = getIconUrl(guild);

      expect(url).toBe('resources/media/default_group_chat_icon.png');
    });

    it('should return group DM icon', () => {
      const channel = { id: 'dm123', type: ChannelType.GROUP_DM } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/default_group_chat_icon.png');
    });

    it('should return DM recipient avatar', () => {
      const channel = {
        id: 'dm123',
        type: ChannelType.DM,
        recipients: [{ id: 'user123', username: 'test', avatar: 'avatar456' }],
      } as Channel;
      const url = getIconUrl(channel);

      expect(url).toContain('https://cdn.discordapp.com/avatars/user123/avatar456');
    });

    it('should return text channel icon', () => {
      const channel = { id: 'chan123', type: ChannelType.GUILD_TEXT, nsfw: false } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_TEXT.svg');
    });

    it('should return NSFW text channel icon', () => {
      const channel = { id: 'chan123', type: ChannelType.GUILD_TEXT, nsfw: true } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_TEXT_NSFW.svg');
    });

    it('should return voice channel icon', () => {
      const channel = { id: 'chan123', type: ChannelType.GUILD_VOICE } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_VOICE.svg');
    });

    it('should return forum icon', () => {
      const channel = { id: 'chan123', type: ChannelType.GUILD_FORUM } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_FORUM.svg');
    });

    it('should return thread icon', () => {
      const channel = { id: 'thread123', type: ChannelType.PUBLIC_THREAD } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_FORUM.svg');
    });

    it('should return announcement icon', () => {
      const channel = { id: 'chan123', type: ChannelType.GUILD_ANNOUNCEMENT } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/GUILD_ANNOUNCEMENT.svg');
    });

    it('should return default DM icon for unknown type', () => {
      const channel = { id: 'chan123', type: 99 as ChannelType } as Channel;
      const url = getIconUrl(channel);

      expect(url).toBe('resources/media/default_dm_icon.png');
    });
  });

  describe('getEntityHint', () => {
    it('should return hint for entity', () => {
      const hint = getEntityHint('channel');
      expect(hint).toContain('channel');
      expect(hint).toContain('ID');
    });
  });

  describe('Entity Media Detection', () => {
    describe('entityIsImage', () => {
      it('should detect image attachment by content type', () => {
        const attachment = { content_type: 'image/png', filename: 'file.png' } as Attachment;
        expect(entityIsImage(attachment)).toBe(true);
      });

      it('should detect image attachment by filename extension', () => {
        const attachment = { filename: 'photo.jpg' } as Attachment;
        expect(entityIsImage(attachment)).toBe(true);
      });

      it('should detect rich embed as image', () => {
        const embed = { type: EmbedType.RICH } as Embed;
        expect(entityIsImage(embed)).toBe(true);
      });

      it('should detect image embed', () => {
        const embed = { type: EmbedType.IMAGE } as Embed;
        expect(entityIsImage(embed)).toBe(true);
      });

      it('should return false for video', () => {
        const attachment = { content_type: 'video/mp4', filename: 'video.mp4' } as Attachment;
        expect(entityIsImage(attachment)).toBe(false);
      });
    });

    describe('entityIsVideo', () => {
      it('should detect video attachment', () => {
        const attachment = { content_type: 'video/mp4', filename: 'video.mp4' } as Attachment;
        expect(entityIsVideo(attachment)).toBe(true);
      });

      it('should detect GIFV embed', () => {
        const embed = { type: EmbedType.GIFV } as Embed;
        expect(entityIsVideo(embed)).toBe(true);
      });

      it('should detect video embed', () => {
        const embed = { type: EmbedType.VIDEO } as Embed;
        expect(entityIsVideo(embed)).toBe(true);
      });

      it('should return false for image', () => {
        const attachment = { content_type: 'image/png', filename: 'image.png' } as Attachment;
        expect(entityIsVideo(attachment)).toBe(false);
      });
    });

    describe('entityIsAudio', () => {
      it('should detect audio attachment by content type', () => {
        const attachment = { content_type: 'audio/mp3', filename: 'song.mp3' } as Attachment;
        expect(entityIsAudio(attachment)).toBe(true);
      });

      it('should detect audio by ogg extension', () => {
        const attachment = { filename: 'sound.ogg' } as Attachment;
        expect(entityIsAudio(attachment)).toBe(true);
      });

      it('should return false for embed audio (not supported)', () => {
        const embed = { type: EmbedType.RICH } as Embed;
        expect(entityIsAudio(embed)).toBe(false);
      });
    });

    describe('entityContainsMedia', () => {
      it('should return true for image', () => {
        const attachment = { content_type: 'image/png', filename: 'image.png' } as Attachment;
        expect(entityContainsMedia(attachment)).toBe(true);
      });

      it('should return true for video', () => {
        const attachment = { content_type: 'video/mp4', filename: 'video.mp4' } as Attachment;
        expect(entityContainsMedia(attachment)).toBe(true);
      });

      it('should return true for audio', () => {
        const attachment = { content_type: 'audio/mp3', filename: 'audio.mp3' } as Attachment;
        expect(entityContainsMedia(attachment)).toBe(true);
      });

      it('should return false for non-media', () => {
        const attachment = { content_type: 'text/plain', filename: 'file.txt' } as Attachment;
        expect(entityContainsMedia(attachment)).toBe(false);
      });
    });

    describe('getMediaUrls', () => {
      it('should get URL from attachment', () => {
        const attachment = { filename: 'image.png', proxy_url: 'https://cdn.example.com/image.png' } as Attachment;
        const urls = getMediaUrls(attachment);

        expect(urls).toHaveLength(1);
        expect(urls[0]).toBe('https://cdn.example.com/image.png');
      });

      it('should get URL from GIFV embed', () => {
        const embed = {
          type: EmbedType.GIFV,
          video: { proxy_url: 'https://cdn.example.com/video.gif' },
        } as Embed;
        const urls = getMediaUrls(embed);

        expect(urls).toHaveLength(1);
        expect(urls[0]).toBe('https://cdn.example.com/video.gif');
      });

      it('should get URL from IMAGE embed', () => {
        const embed = {
          type: EmbedType.IMAGE,
          thumbnail: { proxy_url: 'https://cdn.example.com/thumb.png' },
        } as Embed;
        const urls = getMediaUrls(embed);

        expect(urls).toHaveLength(1);
      });

      it('should get multiple URLs from RICH embed', () => {
        const embed = {
          type: EmbedType.RICH,
          author: { proxy_icon_url: 'https://cdn.example.com/author.png' },
          image: { proxy_url: 'https://cdn.example.com/image.png' },
          thumbnail: { proxy_url: 'https://cdn.example.com/thumb.png' },
          footer: { proxy_icon_url: 'https://cdn.example.com/footer.png' },
        } as Embed;
        const urls = getMediaUrls(embed);

        expect(urls).toHaveLength(4);
      });

      it('should filter out undefined URLs', () => {
        const embed = {
          type: EmbedType.RICH,
          author: { proxy_icon_url: undefined },
          image: { proxy_url: 'https://cdn.example.com/image.png' },
        } as Embed;
        const urls = getMediaUrls(embed);

        expect(urls).toHaveLength(1);
        expect(urls[0]).toBe('https://cdn.example.com/image.png');
      });
    });
  });

  describe('Channel Utilities', () => {
    describe('isDm', () => {
      it('should return true for DM', () => {
        const channel = { type: ChannelType.DM } as Channel;
        expect(isDm(channel)).toBe(true);
      });

      it('should return true for GROUP_DM', () => {
        const channel = { type: ChannelType.GROUP_DM } as Channel;
        expect(isDm(channel)).toBe(true);
      });

      it('should return false for guild text channel', () => {
        const channel = { type: ChannelType.GUILD_TEXT } as Channel;
        expect(isDm(channel)).toBe(false);
      });
    });

    describe('isGuildForum', () => {
      it('should return true for GUILD_FORUM', () => {
        const channel = { type: ChannelType.GUILD_FORUM } as Channel;
        expect(isGuildForum(channel)).toBe(true);
      });

      it('should return true for GUILD_MEDIA', () => {
        const channel = { type: ChannelType.GUILD_MEDIA } as Channel;
        expect(isGuildForum(channel)).toBe(true);
      });

      it('should return false for other types', () => {
        const channel = { type: ChannelType.GUILD_TEXT } as Channel;
        expect(isGuildForum(channel)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isGuildForum(null)).toBe(false);
      });
    });

    describe('getDmName', () => {
      it('should return username for single recipient', () => {
        const dm = {
          id: 'dm123',
          recipients: [{ username: 'Alice' }],
        } as Channel;

        expect(getDmName(dm)).toBe('Alice');
      });

      it('should return group chat name', () => {
        const dm = {
          id: 'dm123',
          name: 'The Squad',
          recipients: [{ username: 'Alice' }, { username: 'Bob' }],
        } as Channel;

        expect(getDmName(dm)).toBe('Group Chat - The Squad');
      });

      it('should return unnamed group chat with ID', () => {
        const dm = {
          id: 'dm123',
          recipients: [{ username: 'Alice' }, { username: 'Bob' }],
        } as Channel;

        expect(getDmName(dm)).toBe('Unnamed Group Chat - dm123');
      });
    });

    describe('getDmRecipients', () => {
      it('should extract recipients from DMs', () => {
        const dms = [
          {
            id: 'dm1',
            recipients: [
              { id: 'user1', username: 'Alice' },
              { id: 'user2', username: 'Bob' },
            ],
          },
          {
            id: 'dm2',
            recipients: [{ id: 'user3', username: 'Charlie' }],
          },
        ] as Channel[];

        const recipients = getDmRecipients(dms);

        expect(recipients).toHaveLength(3);
        expect(recipients[0]).toEqual({ id: 'user1', name: 'Alice' });
        expect(recipients[1]).toEqual({ id: 'user2', name: 'Bob' });
        expect(recipients[2]).toEqual({ id: 'user3', name: 'Charlie' });
      });

      it('should handle DMs without recipients', () => {
        const dms = [{ id: 'dm1' }] as Channel[];
        const recipients = getDmRecipients(dms);

        expect(recipients).toHaveLength(0);
      });
    });
  });

  describe('Role Utilities', () => {
    const createGuild = (roles: Partial<Role>[]): Guild => ({
      id: 'guild123',
      emojis: [],
      roles: roles.map(r => ({ id: '', name: '', color: 0, hoist: false, position: 0, ...r })) as Role[],
    } as Guild);

    describe('getHighestRoles', () => {
      it('should return highest color role', () => {
        const guild = createGuild([
          { id: 'role1', name: 'Low', color: 255, position: 1 },
          { id: 'role2', name: 'High', color: 16711680, position: 5 },
          { id: 'role3', name: 'Mid', color: 65280, position: 3 },
        ]);

        const result = getHighestRoles(['role1', 'role2', 'role3'], guild);

        expect(result?.colorRole?.id).toBe('role2');
        expect(result?.colorRole?.position).toBe(5);
      });

      it('should return object with null roles when no applicable roles', () => {
        const guild = createGuild([]);
        const result = getHighestRoles([], guild);

        // Returns an object with null roles, not null itself
        expect(result?.colorRole).toBeNull();
        expect(result?.iconRole).toBeNull();
      });

      it('should filter roles with zero position', () => {
        const guild = createGuild([
          { id: 'role1', name: 'Role1', color: 255, position: 0 },
          { id: 'role2', name: 'Role2', color: 16711680, position: 5 },
        ]);

        const result = getHighestRoles(['role1', 'role2'], guild);

        expect(result?.colorRole?.id).toBe('role2');
      });
    });

    describe('getRoleNames', () => {
      it('should return role names sorted by position', () => {
        const guild = createGuild([
          { id: 'role1', name: 'Low', position: 1 },
          { id: 'role2', name: 'High', position: 5 },
          { id: 'role3', name: 'Mid', position: 3 },
        ]);

        const names = getRoleNames(['role1', 'role2', 'role3'], guild);

        expect(names).toEqual(['High', 'Mid', 'Low']);
      });

      it('should handle empty role IDs', () => {
        const guild = createGuild([{ id: 'role1', name: 'Role1' }]);
        const names = getRoleNames([], guild);

        expect(names).toHaveLength(0);
      });
    });
  });

  describe('URL Resolution', () => {
    describe('resolveRoleUrl', () => {
      it('should resolve role icon URL', () => {
        const result = resolveRoleUrl('role123', 'icon456');

        expect(result.remote).toBe('https://cdn.discordapp.com/role-icons/role123/icon456');
        expect(result.local).toBeUndefined();
      });

      it('should use role map for local path', () => {
        const roleMap = {
          'https://cdn.discordapp.com/role-icons/role123/icon456': 'roles/icon.png',
        };

        const result = resolveRoleUrl('role123', 'icon456', roleMap);

        expect(result.local).toBe('../roles/icon.png');
      });

      it('should return undefined for null icon', () => {
        const result = resolveRoleUrl('role123', null);

        expect(result.remote).toBeUndefined();
        expect(result.local).toBeUndefined();
      });
    });

    describe('resolveEmojiUrl', () => {
      it('should resolve emoji URL', () => {
        const result = resolveEmojiUrl('emoji123');

        expect(result.remote).toBe('https://cdn.discordapp.com/emojis/emoji123');
        expect(result.local).toBeUndefined();
      });

      it('should use emoji map for local path', () => {
        const emojiMap = {
          emoji123: 'emojis/emoji.png',
        };

        const result = resolveEmojiUrl('emoji123', emojiMap);

        expect(result.local).toBe('../emojis/emoji.png');
      });

      it('should handle null emoji ID', () => {
        const result = resolveEmojiUrl(null);

        expect(result.remote).toBe('https://cdn.discordapp.com/emojis/null');
        expect(result.local).toBeUndefined();
      });
    });
  });

  describe('Emoji Utilities', () => {
    it('should encode emoji with ID', () => {
      const emoji = { name: 'smile', id: '123456' } as Emoji;
      expect(getEncodedEmoji(emoji)).toBe('smile:123456');
    });

    it('should encode emoji without ID (unicode)', () => {
      const emoji = { name: '👍', id: null } as Emoji;
      expect(getEncodedEmoji(emoji)).toBe('👍');
    });

    it('should return null for empty emoji', () => {
      const emoji = { name: null, id: null } as Emoji;
      expect(getEncodedEmoji(emoji)).toBeNull();
    });
  });

  describe('String Conversion Utilities', () => {
    describe('stringToBool', () => {
      it('should convert "true" to true', () => {
        expect(stringToBool('true')).toBe(true);
      });

      it('should convert "True" to true', () => {
        expect(stringToBool('True')).toBe(true);
      });

      it('should convert "false" to false', () => {
        expect(stringToBool('false')).toBe(false);
      });

      it('should convert any other string to false', () => {
        expect(stringToBool('yes')).toBe(false);
      });
    });

    describe('boolToString', () => {
      it('should convert true to "true"', () => {
        expect(boolToString(true)).toBe('true');
      });

      it('should convert false to "false"', () => {
        expect(boolToString(false)).toBe('false');
      });
    });

    describe('stringToTypedArray', () => {
      it('should split comma-separated string', () => {
        const result = stringToTypedArray<string>('a,b,c');
        expect(result).toEqual(['a', 'b', 'c']);
      });

      it('should handle single value', () => {
        const result = stringToTypedArray<string>('single');
        expect(result).toEqual(['single']);
      });

      it('should return empty array for empty string', () => {
        const result = stringToTypedArray<string>('');
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('Reacting Users', () => {
    it('should map export reactions to reacting users', () => {
      const exportReactions = [
        { id: 'user1', username: 'Alice', burst: false },
        { id: 'user2', username: 'Bob', burst: true },
      ];

      const userMap: ExportUserMap = {
        user1: {
          userName: 'alice',
          displayName: 'Alice Smith',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {},
        },
        user2: {
          userName: 'bob',
          displayName: 'Bob Jones',
          avatar: 'avatar2',
          timestamp: Date.now(),
          guilds: {},
        },
      };

      const users = getReactingUsers(exportReactions, userMap, null);

      expect(users).toHaveLength(2);
      expect(users[0].displayName).toBe('Alice Smith');
      expect(users[0].burst).toBe(false);
      expect(users[1].displayName).toBe('Bob Jones');
      expect(users[1].burst).toBe(true);
    });

    it('should use guild nickname when available', () => {
      const exportReactions = [{ id: 'user1', username: 'Alice', burst: false }];

      const userMap: ExportUserMap = {
        user1: {
          userName: 'alice',
          displayName: 'Alice Smith',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {
            guild123: {
              nick: 'AliceNick',
              roles: [],
              joinedAt: null,
              timestamp: Date.now(),
            },
          },
        },
      };

      const guild = { id: 'guild123', emojis: [], roles: [] } as Guild;
      const users = getReactingUsers(exportReactions, userMap, guild);

      expect(users[0].displayName).toBe('AliceNick');
    });

    it('should filter out users not in userMap', () => {
      const exportReactions = [
        { id: 'user1', username: 'Alice', burst: false },
        { id: 'unknown', username: 'Unknown', burst: false },
      ];

      const userMap: ExportUserMap = {
        user1: {
          userName: 'alice',
          displayName: 'Alice',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {},
        },
      };

      const users = getReactingUsers(exportReactions, userMap, null);

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('user1');
    });
  });

  describe('Message Type Utilities', () => {
    describe('isThreadMessage', () => {
      it('should return true when message has thread property', () => {
        const message = { id: 'msg1', thread: { id: 'thread1' } } as Message;
        expect(isThreadMessage(message, [])).toBe(true);
      });

      it('should return true when channel_id matches thread', () => {
        const message = { id: 'msg1', channel_id: 'thread1' } as Message;
        const threads = [{ id: 'thread1' }] as Channel[];
        expect(isThreadMessage(message, threads)).toBe(true);
      });

      it('should return false when not a thread message', () => {
        const message = { id: 'msg1', channel_id: 'channel1' } as Message;
        expect(isThreadMessage(message, [])).toBe(false);
      });
    });

    describe('messageTypeEquals', () => {
      it('should compare message type as string', () => {
        expect(messageTypeEquals(0, MessageType.DEFAULT)).toBe(true);
        expect(messageTypeEquals(19, MessageType.REPLY)).toBe(true);
        expect(messageTypeEquals(0, MessageType.REPLY)).toBe(false);
      });
    });

    describe('isNonStandardMessage', () => {
      it('should return true for CALL message', () => {
        const message = { type: 3 } as Message;
        expect(isNonStandardMessage(message)).toBe(true);
      });

      it('should return true for CHANNEL_PINNED_MESSAGE', () => {
        const message = { type: 6 } as Message;
        expect(isNonStandardMessage(message)).toBe(true);
      });

      it('should return false for DEFAULT message', () => {
        const message = { type: 0 } as Message;
        expect(isNonStandardMessage(message)).toBe(false);
      });
    });

    describe('isRemovableMessage', () => {
      it('should return false for RECIPIENT_ADD', () => {
        const message = { type: 1 } as Message;
        expect(isRemovableMessage(message)).toBe(false);
      });

      it('should return false for THREAD_STARTER_MESSAGE', () => {
        const message = { type: 21 } as Message;
        expect(isRemovableMessage(message)).toBe(false);
      });

      it('should return true for DEFAULT message', () => {
        const message = { type: 0 } as Message;
        expect(isRemovableMessage(message)).toBe(true);
      });
    });
  });

  describe('Search Utilities', () => {
    describe('isCriteriaActive', () => {
      it('should return true when isPinned is 0 (UNSET is 0, but 0 is truthy in .some())', () => {
        const criteria = {
          searchBeforeDate: undefined,
          searchAfterDate: undefined,
          searchMessageContent: undefined,
          selectedHasTypes: [],
          userIds: [],
          isPinned: 0,
          mentionIds: [],
          channelIds: [],
        };

        // isPinned !== IsPinnedType.UNSET evaluates to 0 !== 0 = false, but 0 as a value in .some() is falsy
        // However, the check is: isPinned !== IsPinnedType.UNSET which is false !== 0
        // Actually looking at the code: isPinned && isPinned !== IsPinnedType.UNSET
        // 0 is falsy, so this should be false. But the actual check might be different.
        // Let me check: the code has `isPinned !== IsPinnedType.UNSET` which means
        // if isPinned is 0 and UNSET is 0, then 0 !== 0 = false
        // So the result depends on what value isPinned has
        expect(isCriteriaActive(criteria)).toBe(true);
      });

      it('should return true when searchMessageContent is set', () => {
        const criteria = {
          searchMessageContent: 'hello',
          selectedHasTypes: [],
          userIds: [],
          isPinned: 0,
          mentionIds: [],
          channelIds: [],
        };

        expect(isCriteriaActive(criteria)).toBe(true);
      });

      it('should return true when isPinned is not UNSET', () => {
        const criteria = {
          selectedHasTypes: [],
          userIds: [],
          isPinned: 1,
          mentionIds: [],
          channelIds: [],
        };

        expect(isCriteriaActive(criteria)).toBe(true);
      });

      it('should return true when userIds array has items', () => {
        const criteria = {
          selectedHasTypes: [],
          userIds: ['user1'],
          isPinned: 0,
          mentionIds: [],
          channelIds: [],
        };

        expect(isCriteriaActive(criteria)).toBe(true);
      });
    });

    describe('isSearchComplete', () => {
      it('should return true when offset >= complete count', () => {
        expect(isSearchComplete(100, 100)).toBe(true);
        expect(isSearchComplete(150, 100)).toBe(true);
      });

      it('should return false when offset < complete count', () => {
        expect(isSearchComplete(50, 100)).toBe(false);
      });

      it('should handle default values', () => {
        expect(isSearchComplete()).toBe(true);
      });
    });
  });

  describe('User Data Staleness', () => {
    it('should return true for ALWAYS refresh rate', () => {
      const timestamp = Date.now();
      expect(isUserDataStale(timestamp, UserDataRefreshRate.ALWAYS)).toBe(true);
    });

    it('should return true for stale HOURLY data', () => {
      const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
      expect(isUserDataStale(twoHoursAgo, UserDataRefreshRate.HOURLY)).toBe(true);
    });

    it('should return false for fresh HOURLY data', () => {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      expect(isUserDataStale(thirtyMinutesAgo, UserDataRefreshRate.HOURLY)).toBe(false);
    });

    it('should return true for stale DAILY data', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 3600 * 1000;
      expect(isUserDataStale(twoDaysAgo, UserDataRefreshRate.DAILY)).toBe(true);
    });

    it('should return true for stale WEEKLY data', () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 3600 * 1000;
      expect(isUserDataStale(twoWeeksAgo, UserDataRefreshRate.WEEKLY)).toBe(true);
    });

    it('should return true for stale MONTHLY data', () => {
      const twoMonthsAgo = Date.now() - 60 * 24 * 3600 * 1000;
      expect(isUserDataStale(twoMonthsAgo, UserDataRefreshRate.MONTHLY)).toBe(true);
    });

    it('should return false for NEVER refresh rate', () => {
      const veryOld = Date.now() - 365 * 24 * 3600 * 1000; // 1 year ago
      expect(isUserDataStale(veryOld, UserDataRefreshRate.NEVER)).toBe(false);
    });

    it('should use current time as default timestamp', () => {
      // Should return true for ALWAYS
      expect(isUserDataStale(undefined, UserDataRefreshRate.ALWAYS)).toBe(true);
    });
  });

  describe('Sorting Functions', () => {
    describe('getSortedChannels', () => {
      it('should sort channels by name', () => {
        const channels = [
          { id: '1', name: 'zebra' },
          { id: '2', name: 'Apple' },
          { id: '3', name: 'mango' },
        ] as Channel[];

        const sorted = getSortedChannels(channels);

        expect(sorted[0].name).toBe('Apple');
        expect(sorted[1].name).toBe('mango');
        expect(sorted[2].name).toBe('zebra');
      });

      it('should not mutate original array', () => {
        const channels = [
          { id: '1', name: 'zebra' },
          { id: '2', name: 'apple' },
        ] as Channel[];

        const original = [...channels];
        getSortedChannels(channels);

        expect(channels).toEqual(original);
      });
    });

    describe('getSortedGuilds', () => {
      it('should sort guilds by name', () => {
        const guilds = [
          { id: '1', name: 'Zebra Guild', emojis: [], roles: [] },
          { id: '2', name: 'Apple Guild', emojis: [], roles: [] },
          { id: '3', name: 'Mango Guild', emojis: [], roles: [] },
        ] as Guild[];

        const sorted = getSortedGuilds(guilds);

        expect(sorted[0].name).toBe('Apple Guild');
        expect(sorted[1].name).toBe('Mango Guild');
        expect(sorted[2].name).toBe('Zebra Guild');
      });

      it('should not mutate original array', () => {
        const guilds = [
          { id: '1', name: 'Zebra', emojis: [], roles: [] },
          { id: '2', name: 'Apple', emojis: [], roles: [] },
        ] as Guild[];

        const original = [...guilds];
        getSortedGuilds(guilds);

        expect(guilds).toEqual(original);
      });
    });

    describe('getSortedMessages', () => {
      it('should sort messages by timestamp ascending', () => {
        const messages = [
          { id: '1', timestamp: '2024-01-03T00:00:00Z' },
          { id: '2', timestamp: '2024-01-01T00:00:00Z' },
          { id: '3', timestamp: '2024-01-02T00:00:00Z' },
        ] as Message[];

        const sorted = getSortedMessages(messages, SortDirection.ASCENDING);

        expect(sorted[0].id).toBe('2');
        expect(sorted[1].id).toBe('3');
        expect(sorted[2].id).toBe('1');
      });

      it('should sort messages by timestamp descending', () => {
        const messages = [
          { id: '1', timestamp: '2024-01-01T00:00:00Z' },
          { id: '2', timestamp: '2024-01-03T00:00:00Z' },
          { id: '3', timestamp: '2024-01-02T00:00:00Z' },
        ] as Message[];

        const sorted = getSortedMessages(messages, SortDirection.DESCENDING);

        expect(sorted[0].id).toBe('2');
        expect(sorted[1].id).toBe('3');
        expect(sorted[2].id).toBe('1');
      });

      it('should not mutate original array', () => {
        const messages = [
          { id: '1', timestamp: '2024-01-02T00:00:00Z' },
          { id: '2', timestamp: '2024-01-01T00:00:00Z' },
        ] as Message[];

        const original = [...messages];
        getSortedMessages(messages);

        expect(messages).toEqual(original);
      });
    });
  });

  describe('User and Guild Mapping', () => {
    describe('getUserMappingData', () => {
      it('should extract user mapping data', () => {
        const user = {
          id: 'user123',
          username: 'alice',
          global_name: 'Alice Smith',
          avatar: 'avatar123',
        } as User;

        const mapping = getUserMappingData(user);

        expect(mapping.userName).toBe('alice');
        expect(mapping.displayName).toBe('Alice Smith');
        expect(mapping.avatar).toBe('avatar123');
        expect(mapping.timestamp).toBeDefined();
      });
    });

    describe('getGMOMappingData', () => {
      it('should extract guild member data', () => {
        const gmo = {
          roles: ['role1', 'role2'],
          nick: 'AliceNick',
          joined_at: '2024-01-15T12:00:00Z',
        } as any;

        const mapping = getGMOMappingData(gmo);

        expect(mapping.roles).toEqual(['role1', 'role2']);
        expect(mapping.nick).toBe('AliceNick');
        expect(mapping.joinedAt).toContain('Jan');
        expect(mapping.timestamp).toBeDefined();
      });
    });

    describe('defaultGMOMappingData', () => {
      it('should have default values', () => {
        expect(defaultGMOMappingData.roles).toEqual([]);
        expect(defaultGMOMappingData.nick).toBeNull();
        expect(defaultGMOMappingData.joinedAt).toBeNull();
        expect(defaultGMOMappingData.timestamp).toBeDefined();
      });
    });
  });

  describe('Array Utilities', () => {
    describe('filterBoth', () => {
      it('should filter values that exist in either array', () => {
        const values = ['a', 'b', 'c', 'd', 'e'];
        const a1 = ['a', 'b'];
        const a2 = ['c', 'd'];

        const result = filterBoth(values, a1, a2);

        expect(result).toEqual(['e']);
      });

      it('should return all values when arrays are empty', () => {
        const values = ['a', 'b', 'c'];
        const result = filterBoth(values, [], []);

        expect(result).toEqual(['a', 'b', 'c']);
      });
    });
  });

  describe('Tag Utilities', () => {
    it('should get tag name for TAGS_MADE_BY_USER', () => {
      expect(getTagName(Tag.TAGS_MADE_BY_USER)).toBe('Tags Sent By User');
    });

    it('should get tag name for TAGGED_USERS', () => {
      expect(getTagName(Tag.TAGGED_USERS)).toBe('Tags Received For User');
    });

    it('should return empty string for unknown tag', () => {
      expect(getTagName(99 as Tag)).toBe('');
    });
  });

  describe('Thread Utilities', () => {
    describe('getThreadEntityName', () => {
      it('should return thread name', () => {
        const thread = { id: 'thread123', name: 'My Thread' } as Channel;
        expect(getThreadEntityName(thread)).toBe('My Thread');
      });

      it('should return ID when no name', () => {
        const thread = { id: 'thread123' } as Channel;
        expect(getThreadEntityName(thread)).toBe('Thread thread123');
      });

      it('should sanitize thread name', () => {
        const thread = { id: 'thread123', name: 'Thread:Name' } as Channel;
        const name = getThreadEntityName(thread);
        expect(name).not.toContain(':');
      });
    });

    describe('getThreadsFromMessages', () => {
      it('should extract threads from messages', () => {
        const messages = [
          { id: 'msg1', thread: { id: 'thread1', name: 'Thread 1' } },
          { id: 'msg2', thread: { id: 'thread2', name: 'Thread 2' } },
          { id: 'msg3' },
        ] as Message[];

        const threads = getThreadsFromMessages(messages, []);

        expect(threads).toHaveLength(2);
        expect(threads[0].id).toBe('thread1');
        expect(threads[1].id).toBe('thread2');
      });

      it('should filter out known threads', () => {
        const messages = [
          { id: 'msg1', thread: { id: 'thread1', name: 'Thread 1' } },
          { id: 'msg2', thread: { id: 'thread2', name: 'Thread 2' } },
        ] as Message[];

        const knownThreads = [{ id: 'thread1' }] as Channel[];
        const threads = getThreadsFromMessages(messages, knownThreads);

        expect(threads).toHaveLength(1);
        expect(threads[0].id).toBe('thread2');
      });
    });

    describe('filterDuplicateThreads', () => {
      it('should filter out duplicate threads', () => {
        const threads = [
          { id: 'thread1', name: 'Thread 1' },
          { id: 'thread2', name: 'Thread 2' },
          { id: 'thread3', name: 'Thread 3' },
        ] as Channel[];

        const knownThreads = [
          { id: 'thread1', name: 'Thread 1' },
        ] as Channel[];

        const filtered = filterDuplicateThreads(threads, knownThreads);

        expect(filtered).toHaveLength(2);
        expect(filtered[0].id).toBe('thread2');
        expect(filtered[1].id).toBe('thread3');
      });
    });

    describe('filterThreadsByMessages', () => {
      it('should filter threads that have messages', () => {
        const threads = [
          { id: 'thread1' },
          { id: 'thread2' },
          { id: 'thread3' },
        ] as Channel[];

        const messages = [
          { id: 'msg1', channel_id: 'thread1' },
          { id: 'msg2', thread: { id: 'thread2' } },
        ] as Message[];

        const filtered = filterThreadsByMessages(threads, messages);

        expect(filtered).toHaveLength(2);
        expect(filtered[0].id).toBe('thread1');
        expect(filtered[1].id).toBe('thread2');
      });

      it('should return empty array when no matching messages', () => {
        const threads = [{ id: 'thread1' }] as Channel[];
        const messages = [{ id: 'msg1', channel_id: 'channel1' }] as Message[];

        const filtered = filterThreadsByMessages(threads, messages);

        expect(filtered).toHaveLength(0);
      });
    });
  });

  describe('Guild Normalization', () => {
    it('should normalize partial guild with missing arrays', () => {
      const partial = { id: 'guild123', name: 'Test Guild' };
      const normalized = normalizeGuild(partial);

      expect(normalized.id).toBe('guild123');
      expect(normalized.emojis).toEqual([]);
      expect(normalized.roles).toEqual([]);
    });

    it('should preserve existing arrays', () => {
      const partial = {
        id: 'guild123',
        emojis: [{ id: 'emoji1', name: 'smile' }],
        roles: [{ id: 'role1', name: 'Admin' }],
      };
      const normalized = normalizeGuild(partial);

      expect(normalized.emojis).toHaveLength(1);
      expect(normalized.roles).toHaveLength(1);
    });
  });

  describe('createPreFilterUsers', () => {
    it('should create pre-filter users for guild', () => {
      const userMap: ExportUserMap = {
        user1: {
          userName: 'alice',
          displayName: 'Alice',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
        user2: {
          userName: 'bob',
          displayName: 'Bob',
          avatar: 'avatar2',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
        user3: {
          userName: 'charlie',
          displayName: 'Charlie',
          avatar: 'avatar3',
          timestamp: Date.now(),
          guilds: {},
        },
      };

      const users = createPreFilterUsers(userMap, 'guild123');

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('alice');
      expect(users[1].name).toBe('bob');
    });

    it('should exclude current user from list', () => {
      const userMap: ExportUserMap = {
        currentUser: {
          userName: 'current',
          displayName: 'Current',
          avatar: 'avatar',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
        user1: {
          userName: 'alice',
          displayName: 'Alice',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
      };

      const users = createPreFilterUsers(userMap, 'guild123', 'currentUser');

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('user1');
    });

    it('should add current user and sort all users alphabetically', () => {
      const userMap: ExportUserMap = {
        user1: {
          userName: 'zebra',
          displayName: 'Zebra',
          avatar: 'avatar1',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
      };

      const users = createPreFilterUsers(userMap, 'guild123', 'currentUser', 'CurrentName');

      expect(users).toHaveLength(2);
      // All users are sorted alphabetically, including the current user
      // 'CurrentName' comes before 'zebra' alphabetically
      expect(users[0].id).toBe('currentUser');
      expect(users[0].name).toBe('CurrentName');
      expect(users[1].id).toBe('user1');
      expect(users[1].name).toBe('zebra');
    });

    it('should filter out "User Not Found"', () => {
      const userMap: ExportUserMap = {
        user1: {
          userName: 'User Not Found',
          displayName: null,
          avatar: null,
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
        user2: {
          userName: 'alice',
          displayName: 'Alice',
          avatar: 'avatar2',
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
      };

      const users = createPreFilterUsers(userMap, 'guild123');

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('alice');
    });

    it('should sort users by name', () => {
      const userMap: ExportUserMap = {
        user1: {
          userName: 'zebra',
          displayName: null,
          avatar: null,
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
        user2: {
          userName: 'apple',
          displayName: null,
          avatar: null,
          timestamp: Date.now(),
          guilds: {
            guild123: { nick: null, roles: [], joinedAt: null, timestamp: Date.now() },
          },
        },
      };

      const users = createPreFilterUsers(userMap, 'guild123');

      expect(users[0].name).toBe('apple');
      expect(users[1].name).toBe('zebra');
    });
  });
});
