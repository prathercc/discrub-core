import { describe, it, expect } from 'vitest';
import { isMessage, isGuild, isRole, isAttachment } from './discrub-guards.ts';
import type { Message, Guild, Role, Attachment } from '../types/discord-types.ts';

describe('discrub-guards', () => {
  describe('isMessage', () => {
    it('should return true for valid message object', () => {
      const message: Message = {
        id: '123',
        channel_id: 'channel-1',
        content: 'Hello',
        timestamp: new Date().toISOString(),
        type: 0,
        author: {
          id: 'user-1',
          username: 'testuser',
          discriminator: '0001',
        },
        attachments: [],
        embeds: [],
      } as Message;

      expect(isMessage(message)).toBe(true);
    });

    it('should return true for message with minimal required properties', () => {
      const message = {
        content: 'Hello',
        attachments: [],
        embeds: [],
      };

      expect(isMessage(message)).toBe(true);
    });

    it('should return false for object missing content', () => {
      const notMessage = {
        attachments: [],
        embeds: [],
      };

      expect(isMessage(notMessage)).toBe(false);
    });

    it('should return false for object missing attachments', () => {
      const notMessage = {
        content: 'Hello',
        embeds: [],
      };

      expect(isMessage(notMessage)).toBe(false);
    });

    it('should return false for object missing embeds', () => {
      const notMessage = {
        content: 'Hello',
        attachments: [],
      };

      expect(isMessage(notMessage)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMessage(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isMessage({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isMessage([])).toBe(false);
    });
  });

  describe('isGuild', () => {
    it('should return true for valid guild object', () => {
      const guild: Guild = {
        id: 'guild-1',
        name: 'Test Guild',
        icon: 'icon-hash',
        owner_id: 'owner-1',
        emojis: [],
        roles: [],
      } as Guild;

      expect(isGuild(guild)).toBe(true);
    });

    it('should return true for guild with minimal required properties', () => {
      const guild = {
        emojis: [],
        roles: [],
      };

      expect(isGuild(guild)).toBe(true);
    });

    it('should return false for object missing emojis', () => {
      const notGuild = {
        roles: [],
      };

      expect(isGuild(notGuild)).toBe(false);
    });

    it('should return false for object missing roles', () => {
      const notGuild = {
        emojis: [],
      };

      expect(isGuild(notGuild)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isGuild(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGuild(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isGuild({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isGuild([])).toBe(false);
    });
  });

  describe('isRole', () => {
    it('should return true for valid role object', () => {
      const role: Role = {
        id: 'role-1',
        name: 'Admin',
        color: 16711680,
        hoist: true,
        position: 5,
        permissions: '123456',
      } as Role;

      expect(isRole(role)).toBe(true);
    });

    it('should return true for role with minimal required properties', () => {
      const role = {
        color: 0,
        hoist: false,
      };

      expect(isRole(role)).toBe(true);
    });

    it('should return false for object missing color', () => {
      const notRole = {
        hoist: true,
      };

      expect(isRole(notRole)).toBe(false);
    });

    it('should return false for object missing hoist', () => {
      const notRole = {
        color: 16711680,
      };

      expect(isRole(notRole)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRole(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRole(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isRole({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isRole([])).toBe(false);
    });
  });

  describe('isAttachment', () => {
    it('should return true for valid attachment object', () => {
      const attachment: Attachment = {
        id: 'attach-1',
        filename: 'image.png',
        size: 12345,
        url: 'https://cdn.discord.com/attachments/123/456/image.png',
        proxy_url: 'https://media.discordapp.net/attachments/123/456/image.png',
      } as Attachment;

      expect(isAttachment(attachment)).toBe(true);
    });

    it('should return true for attachment with minimal required properties', () => {
      const attachment = {
        filename: 'document.pdf',
      };

      expect(isAttachment(attachment)).toBe(true);
    });

    it('should return false for object missing filename', () => {
      const notAttachment = {
        id: 'attach-1',
        size: 12345,
      };

      expect(isAttachment(notAttachment)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAttachment(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAttachment(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isAttachment({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isAttachment([])).toBe(false);
    });
  });

  describe('Type Guard Usage', () => {
    it('should filter messages from mixed array', () => {
      const items = [
        { content: 'Test', attachments: [], embeds: [] },
        { emojis: [], roles: [] },
        { content: 'Another', attachments: [], embeds: [] },
        { color: 0, hoist: false },
      ];

      const messages = items.filter(isMessage);

      expect(messages).toHaveLength(2);
    });

    it('should filter guilds from mixed array', () => {
      const items = [
        { content: 'Test', attachments: [], embeds: [] },
        { emojis: [], roles: [] },
        { emojis: [{ id: '1', name: 'emoji' }], roles: [] },
      ];

      const guilds = items.filter(isGuild);

      expect(guilds).toHaveLength(2);
    });

    it('should filter roles from mixed array', () => {
      const items = [
        { color: 16711680, hoist: true },
        { emojis: [], roles: [] },
        { color: 0, hoist: false },
      ];

      const roles = items.filter(isRole);

      expect(roles).toHaveLength(2);
    });

    it('should filter attachments from mixed array', () => {
      const items = [
        { filename: 'image.png' },
        { content: 'Test', attachments: [], embeds: [] },
        { filename: 'document.pdf' },
      ];

      const attachments = items.filter(isAttachment);

      expect(attachments).toHaveLength(2);
    });
  });
});
