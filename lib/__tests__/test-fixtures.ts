/**
 * Test Fixtures - Reusable mock data for tests
 *
 * This file contains mock Discord API objects that can be reused across tests.
 * All fixtures follow Discord API structure as defined in lib/types/discord-types.ts
 */

import type { User, Guild, Channel, Message, Role, Attachment, Embed, Reaction } from '../types/discord-types.ts';
import { ChannelType, MessageType } from '../enum/discord-enum.ts';

/**
 * Mock User Objects
 */
export const mockUser: User = {
  id: '123456789',
  username: 'testuser',
  discriminator: '0001',
  global_name: 'Test User',
  avatar: 'abc123def456',
  bot: false,
  system: false,
  mfa_enabled: false,
  banner: null,
  accent_color: null,
  locale: 'en-US',
  verified: true,
  email: 'test@example.com',
  flags: 0,
  premium_type: 0,
  public_flags: 0,
};

export const mockBotUser: User = {
  id: '987654321',
  username: 'botuser',
  discriminator: '0000',
  global_name: null,
  avatar: null,
  bot: true,
  system: false,
};

export const mockUserWithoutAvatar: User = {
  id: '111222333',
  username: 'noavatar',
  discriminator: '1234',
  global_name: null,
  avatar: null,
};

/**
 * Mock Guild Objects
 */
export const mockGuild: Guild = {
  id: 'guild-123',
  name: 'Test Guild',
  icon: 'guild-icon-hash',
  icon_hash: null,
  splash: null,
  discovery_splash: null,
  owner: false,
  owner_id: '123456789',
  permissions: '0',
  region: 'us-west',
  afk_channel_id: null,
  afk_timeout: 300,
  widget_enabled: false,
  widget_channel_id: null,
  verification_level: 1,
  default_message_notifications: 0,
  explicit_content_filter: 0,
  roles: [],
  emojis: [],
  features: [],
  mfa_level: 0,
  application_id: null,
  system_channel_id: null,
  system_channel_flags: 0,
  rules_channel_id: null,
};

/**
 * Mock Role Objects
 */
export const mockRole: Role = {
  id: 'role-123',
  name: 'Admin',
  color: 0xff0000,
  hoist: true,
  icon: null,
  unicode_emoji: null,
  position: 1,
  permissions: '8',
  managed: false,
  mentionable: true,
  flags: 0,
};

export const mockMemberRole: Role = {
  id: 'role-456',
  name: 'Member',
  color: 0x99aab5,
  hoist: false,
  icon: null,
  unicode_emoji: null,
  position: 0,
  permissions: '104324161',
  managed: false,
  mentionable: false,
  flags: 0,
};

/**
 * Mock Channel Objects
 */
export const mockTextChannel: Channel = {
  id: 'channel-123',
  type: ChannelType.GUILD_TEXT,
  guild_id: 'guild-123',
  position: 1,
  permission_overwrites: [],
  name: 'general',
  topic: 'General discussion',
  nsfw: false,
  last_message_id: 'msg-999',
  rate_limit_per_user: 0,
  parent_id: null,
  last_pin_timestamp: null,
};

export const mockDMChannel: Channel = {
  id: 'dm-456',
  type: ChannelType.DM,
  last_message_id: null,
  recipients: [mockUser],
};

/**
 * Mock Attachment Objects
 */
export const mockAttachment: Attachment = {
  id: 'attachment-123',
  filename: 'image.png',
  description: 'Test image',
  content_type: 'image/png',
  size: 102400,
  url: 'https://cdn.discordapp.com/attachments/123/456/image.png',
  proxy_url: 'https://media.discordapp.net/attachments/123/456/image.png',
  height: 1920,
  width: 1080,
  ephemeral: false,
};

/**
 * Mock Embed Objects
 */
export const mockEmbed: Embed = {
  title: 'Test Embed',
  type: 'rich',
  description: 'This is a test embed',
  url: 'https://example.com',
  timestamp: '2024-01-01T00:00:00Z',
  color: 0x00ff00,
  footer: {
    text: 'Footer text',
    icon_url: 'https://example.com/icon.png',
  },
  author: {
    name: 'Author Name',
    url: 'https://example.com',
    icon_url: 'https://example.com/author.png',
  },
  fields: [
    {
      name: 'Field 1',
      value: 'Value 1',
      inline: true,
    },
    {
      name: 'Field 2',
      value: 'Value 2',
      inline: false,
    },
  ],
};

/**
 * Mock Reaction Objects
 */
export const mockReaction: Reaction = {
  count: 5,
  count_details: {
    burst: 0,
    normal: 5,
  },
  me: false,
  me_burst: false,
  emoji: {
    id: null,
    name: '👍',
    animated: false,
  },
  burst_colors: [],
};

export const mockCustomEmojiReaction: Reaction = {
  count: 3,
  count_details: {
    burst: 1,
    normal: 2,
  },
  me: true,
  me_burst: false,
  emoji: {
    id: 'emoji-123',
    name: 'custom_emoji',
    animated: true,
  },
  burst_colors: [],
};

/**
 * Mock Message Objects
 */
export const mockMessage: Message = {
  id: 'msg-123',
  channel_id: 'channel-123',
  author: mockUser,
  content: 'Hello, world!',
  timestamp: '2024-01-01T12:00:00Z',
  edited_timestamp: null,
  tts: false,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  reactions: [],
  pinned: false,
  type: MessageType.DEFAULT,
};

export const mockMessageWithMentions: Message = {
  id: 'msg-456',
  channel_id: 'channel-123',
  author: mockUser,
  content: 'Hello <@987654321>! Check out <#channel-456>',
  timestamp: '2024-01-01T12:05:00Z',
  edited_timestamp: null,
  tts: false,
  mention_everyone: false,
  mentions: [mockBotUser],
  mention_roles: ['role-123'],
  attachments: [],
  embeds: [],
  reactions: [],
  pinned: false,
  type: MessageType.DEFAULT,
};

export const mockMessageWithAttachments: Message = {
  id: 'msg-789',
  channel_id: 'channel-123',
  author: mockUser,
  content: 'Check out this image!',
  timestamp: '2024-01-01T12:10:00Z',
  edited_timestamp: null,
  tts: false,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [mockAttachment],
  embeds: [],
  reactions: [],
  pinned: false,
  type: MessageType.DEFAULT,
};

export const mockMessageWithReactions: Message = {
  id: 'msg-999',
  channel_id: 'channel-123',
  author: mockUser,
  content: 'React to this!',
  timestamp: '2024-01-01T12:15:00Z',
  edited_timestamp: null,
  tts: false,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  reactions: [mockReaction, mockCustomEmojiReaction],
  pinned: true,
  type: MessageType.DEFAULT,
};

/**
 * Mock Message Arrays
 */
export const createMockMessages = (count: number): Message[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    channel_id: 'channel-123',
    author: i % 2 === 0 ? mockUser : mockBotUser,
    content: `Message ${i}`,
    timestamp: new Date(2024, 0, 1, 12, i).toISOString(),
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    reactions: [],
    pinned: false,
    type: MessageType.DEFAULT,
  }));
};

/**
 * Mock API Response Wrappers
 */
export const mockSuccessResponse = <T>(data: T) => ({
  ok: true,
  status: 200,
  json: async () => data,
  headers: new Headers(),
} as Response);

export const mockErrorResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: async () => ({ message: statusText }),
  headers: new Headers(),
} as Response);

export const mockRateLimitResponse = (retryAfter: number = 1) => ({
  ok: false,
  status: 429,
  statusText: 'Too Many Requests',
  headers: new Headers({ 'retry-after': retryAfter.toString() }),
  json: async () => ({ message: 'Rate limited', retry_after: retryAfter }),
} as Response);
