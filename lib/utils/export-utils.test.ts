import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  replaceUserMentionsWithUsernames,
  convertEmojisToHtml,
  renderEmojiAsHtml,
} from './export-utils.ts';
import * as messageFormattingUtils from './message-formatting-utils.ts';

// Mock the message-formatting-utils module
vi.mock('./message-formatting-utils.ts', () => ({
  parseSpecialFormatting: vi.fn(),
}));

describe('export-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('replaceUserMentionsWithUsernames', () => {
    it('should replace user mentions with usernames', () => {
      const content = 'Hello <@123> and <@456>!';
      const userMap = {
        '123': { userName: 'alice' },
        '456': { userName: 'bob' },
      };

      vi.mocked(messageFormattingUtils.parseSpecialFormatting).mockReturnValue({
        userMention: [
          { id: '123', raw: '<@123>' },
          { id: '456', raw: '<@456>' },
        ],
        roleMention: [],
        channelMention: [],
        everyoneMention: [],
        hereMention: [],
        customEmoji: [],
      } as any);

      const result = replaceUserMentionsWithUsernames(content, userMap, []);

      expect(result).toBe('Hello @alice and @bob!');
    });

    it('should handle unknown users with "Unknown" fallback', () => {
      const content = 'Hello <@999>!';
      const userMap = {};

      vi.mocked(messageFormattingUtils.parseSpecialFormatting).mockReturnValue({
        userMention: [
          { id: '999', raw: '<@999>' },
        ],
        roleMention: [],
        channelMention: [],
        everyoneMention: [],
        hereMention: [],
        customEmoji: [],
      } as any);

      const result = replaceUserMentionsWithUsernames(content, userMap, []);

      expect(result).toBe('Hello @Unknown!');
    });

    it('should handle users with null userName', () => {
      const content = 'Hello <@123>!';
      const userMap = {
        '123': { userName: null },
      };

      vi.mocked(messageFormattingUtils.parseSpecialFormatting).mockReturnValue({
        userMention: [
          { id: '123', raw: '<@123>' },
        ],
        roleMention: [],
        channelMention: [],
        everyoneMention: [],
        hereMention: [],
        customEmoji: [],
      } as any);

      const result = replaceUserMentionsWithUsernames(content, userMap, []);

      expect(result).toBe('Hello @Unknown!');
    });

    it('should handle content with no user mentions', () => {
      const content = 'Hello world!';
      const userMap = {};

      vi.mocked(messageFormattingUtils.parseSpecialFormatting).mockReturnValue({
        userMention: [],
        roleMention: [],
        channelMention: [],
        everyoneMention: [],
        hereMention: [],
        customEmoji: [],
      } as any);

      const result = replaceUserMentionsWithUsernames(content, userMap, []);

      expect(result).toBe('Hello world!');
    });
  });

  describe('convertEmojisToHtml', () => {
    it('should convert custom emojis to HTML with CDN URLs', () => {
      const content = 'Hello <:smile:123> and <:wave:456>!';
      const result = convertEmojisToHtml(content);

      expect(result).toContain('<img class="emoji" src="https://cdn.discordapp.com/emojis/123.webp" alt=":smile:" title=":smile:">');
      expect(result).toContain('<img class="emoji" src="https://cdn.discordapp.com/emojis/456.webp" alt=":wave:" title=":wave:">');
    });

    it('should handle animated emojis with animated parameter', () => {
      const content = 'Hello <a:dance:789>!';
      const result = convertEmojisToHtml(content);

      expect(result).toContain('<img class="emoji" src="https://cdn.discordapp.com/emojis/789.webp?animated=true" alt=":dance:" title=":dance:">');
    });

    it('should use local paths when emojiMap is provided', () => {
      const content = 'Hello <:smile:123>!';
      const emojiMap = {
        '123': 'test-channel/emojis/123.webp',
      };
      const result = convertEmojisToHtml(content, emojiMap, 'test-channel');

      expect(result).toContain('<img class="emoji" src="emojis/123.webp" alt=":smile:" title=":smile:">');
    });

    it('should fallback to CDN when emoji not in map', () => {
      const content = 'Hello <:smile:123>!';
      const emojiMap = {
        '456': 'test-channel/emojis/456.webp',
      };
      const result = convertEmojisToHtml(content, emojiMap, 'test-channel');

      expect(result).toContain('<img class="emoji" src="https://cdn.discordapp.com/emojis/123.webp" alt=":smile:" title=":smile:">');
    });

    it('should handle content with no custom emojis', () => {
      const content = 'Hello world! 😀';
      const result = convertEmojisToHtml(content);

      expect(result).toBe('Hello world! 😀');
    });

    it('should handle mixed emoji types', () => {
      const content = '<:smile:123> <a:dance:456> text <:wave:789>';
      const result = convertEmojisToHtml(content);

      expect(result).toContain('src="https://cdn.discordapp.com/emojis/123.webp"');
      expect(result).toContain('src="https://cdn.discordapp.com/emojis/456.webp?animated=true"');
      expect(result).toContain('src="https://cdn.discordapp.com/emojis/789.webp"');
    });
  });

  describe('renderEmojiAsHtml', () => {
    it('should render unicode emoji as text', () => {
      const emoji = { id: null, name: '😀' };
      const result = renderEmojiAsHtml(emoji);

      expect(result).toBe('😀');
    });

    it('should render custom emoji with CDN URL', () => {
      const emoji = { id: '123', name: 'smile', animated: false };
      const result = renderEmojiAsHtml(emoji);

      expect(result).toBe('<img class="emoji-reaction" src="https://cdn.discordapp.com/emojis/123.webp" alt=":smile:" title=":smile:">');
    });

    it('should render animated custom emoji with animated parameter', () => {
      const emoji = { id: '456', name: 'dance', animated: true };
      const result = renderEmojiAsHtml(emoji);

      expect(result).toBe('<img class="emoji-reaction" src="https://cdn.discordapp.com/emojis/456.webp?animated=true" alt=":dance:" title=":dance:">');
    });

    it('should use local path when emojiMap is provided', () => {
      const emoji = { id: '123', name: 'smile', animated: false };
      const emojiMap = {
        '123': 'test-channel/emojis/123.webp',
      };
      const result = renderEmojiAsHtml(emoji, emojiMap, 'test-channel');

      expect(result).toBe('<img class="emoji-reaction" src="emojis/123.webp" alt=":smile:" title=":smile:">');
    });

    it('should fallback to CDN when emoji not in map', () => {
      const emoji = { id: '123', name: 'smile', animated: false };
      const emojiMap = {
        '456': 'test-channel/emojis/456.webp',
      };
      const result = renderEmojiAsHtml(emoji, emojiMap, 'test-channel');

      expect(result).toBe('<img class="emoji-reaction" src="https://cdn.discordapp.com/emojis/123.webp" alt=":smile:" title=":smile:">');
    });

    it('should handle emoji with no name', () => {
      const emoji = { id: null, name: null };
      const result = renderEmojiAsHtml(emoji);

      expect(result).toBe('?');
    });

    it('should handle emoji with undefined id', () => {
      const emoji = { id: undefined, name: '👍' };
      const result = renderEmojiAsHtml(emoji);

      expect(result).toBe('👍');
    });
  });
});
