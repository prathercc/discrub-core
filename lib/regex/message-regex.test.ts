import { describe, it, expect } from 'vitest';
import { MessageRegex } from './message-regex.ts';

describe('MessageRegex', () => {
  describe('BOLD', () => {
    it('should match bold text with double asterisks', () => {
      const text = 'This is **bold** text';
      const matches = Array.from(text.matchAll(MessageRegex.BOLD));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('bold');
    });

    it('should match multiple bold sections', () => {
      const text = '**first** and **second**';
      const matches = Array.from(text.matchAll(MessageRegex.BOLD));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });

    it('should not match single asterisks', () => {
      const text = '*not bold*';
      const matches = Array.from(text.matchAll(MessageRegex.BOLD));

      expect(matches).toHaveLength(0);
    });
  });

  describe('ITALICS', () => {
    it('should match italic text with single asterisk', () => {
      const text = 'This is *italic* text';
      const matches = Array.from(text.matchAll(MessageRegex.ITALICS));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('italic');
    });

    it('should match italic text with single underscore', () => {
      const text = 'This is _italic_ text';
      const matches = Array.from(text.matchAll(MessageRegex.ITALICS));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('italic');
    });

    it('should match multiple italic sections', () => {
      const text = '*first* and _second_';
      const matches = Array.from(text.matchAll(MessageRegex.ITALICS));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });
  });

  describe('UNDER_LINE', () => {
    it('should match underlined text with double underscores', () => {
      const text = 'This is __underlined__ text';
      const matches = Array.from(text.matchAll(MessageRegex.UNDER_LINE));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('underlined');
    });

    it('should match multiple underlined sections', () => {
      const text = '__first__ and __second__';
      const matches = Array.from(text.matchAll(MessageRegex.UNDER_LINE));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });

    it('should not match single underscores', () => {
      const text = '_not underlined_';
      const matches = Array.from(text.matchAll(MessageRegex.UNDER_LINE));

      expect(matches).toHaveLength(0);
    });
  });

  describe('STRIKETHROUGH', () => {
    it('should match strikethrough text with double tildes', () => {
      const text = 'This is ~~strikethrough~~ text';
      const matches = Array.from(text.matchAll(MessageRegex.STRIKETHROUGH));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('strikethrough');
    });

    it('should match multiple strikethrough sections', () => {
      const text = '~~first~~ and ~~second~~';
      const matches = Array.from(text.matchAll(MessageRegex.STRIKETHROUGH));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });

    it('should not match single tildes', () => {
      const text = '~not strikethrough~';
      const matches = Array.from(text.matchAll(MessageRegex.STRIKETHROUGH));

      expect(matches).toHaveLength(0);
    });
  });

  describe('SPOILER', () => {
    it('should match spoiler text with double pipes', () => {
      const text = 'This is ||spoiler|| text';
      const matches = Array.from(text.matchAll(MessageRegex.SPOILER));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('spoiler');
    });

    it('should match multiple spoiler sections', () => {
      const text = '||first|| and ||second||';
      const matches = Array.from(text.matchAll(MessageRegex.SPOILER));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });

    it('should not match single pipes', () => {
      const text = '|not spoiler|';
      const matches = Array.from(text.matchAll(MessageRegex.SPOILER));

      expect(matches).toHaveLength(0);
    });
  });

  describe('QUOTE (inline code)', () => {
    it('should match inline code with single backticks', () => {
      const text = 'This is `code` text';
      const matches = Array.from(text.matchAll(MessageRegex.QUOTE));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('code');
    });

    it('should match multiple inline code sections', () => {
      const text = '`first` and `second`';
      const matches = Array.from(text.matchAll(MessageRegex.QUOTE));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.text).toBe('first');
      expect(matches[1].groups?.text).toBe('second');
    });

    it('should extract content between single backticks even in triple backtick context', () => {
      const text = '```not inline code```';
      const matches = Array.from(text.matchAll(MessageRegex.QUOTE));

      // QUOTE regex matches single backtick pairs, so it will match `not inline code`
      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('not inline code');
    });
  });

  describe('CODE (code blocks)', () => {
    it('should match code blocks with triple backticks', () => {
      const text = '```javascript\nconst x = 1;\n```';
      const matches = Array.from(text.matchAll(MessageRegex.CODE));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('javascript\nconst x = 1;\n');
    });

    it('should match code blocks with content containing newlines', () => {
      const text = '```\nline 1\nline 2\nline 3\n```';
      const matches = Array.from(text.matchAll(MessageRegex.CODE));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('\nline 1\nline 2\nline 3\n');
    });

    it('should match code block greedily across multiple sections', () => {
      const text = '```first```\nsome text\n```second```';
      const matches = Array.from(text.matchAll(MessageRegex.CODE));

      // CODE regex is greedy and matches from first ``` to last ```
      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.text).toBe('first```\nsome text\n```second');
    });
  });

  describe('USER_MENTION', () => {
    it('should match basic user mention', () => {
      const text = 'Hello <@123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.USER_MENTION));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.user_id).toBe('123456789');
    });

    it('should match user mention with ! prefix (nickname)', () => {
      const text = 'Hello <@!123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.USER_MENTION));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.user_id).toBe('123456789');
    });

    it('should match user mention with & prefix (role)', () => {
      const text = 'Hello <@&123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.USER_MENTION));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.user_id).toBe('123456789');
    });

    it('should match multiple user mentions', () => {
      const text = '<@111> and <@!222> and <@&333>';
      const matches = Array.from(text.matchAll(MessageRegex.USER_MENTION));

      expect(matches).toHaveLength(3);
      expect(matches[0].groups?.user_id).toBe('111');
      expect(matches[1].groups?.user_id).toBe('222');
      expect(matches[2].groups?.user_id).toBe('333');
    });
  });

  describe('CHANNEL_MENTION', () => {
    it('should match channel mention', () => {
      const text = 'Check out <#123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.CHANNEL_MENTION));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.channel_id).toBe('123456789');
    });

    it('should match multiple channel mentions', () => {
      const text = '<#111> and <#222>';
      const matches = Array.from(text.matchAll(MessageRegex.CHANNEL_MENTION));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.channel_id).toBe('111');
      expect(matches[1].groups?.channel_id).toBe('222');
    });

    it('should not match user mentions', () => {
      const text = '<@123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.CHANNEL_MENTION));

      expect(matches).toHaveLength(0);
    });
  });

  describe('EMOJI', () => {
    it('should match custom emoji', () => {
      const text = 'Hello <:emoji_name:123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.EMOJI));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('<:emoji_name:123456789>');
    });

    it('should match animated custom emoji', () => {
      const text = 'Hello <a:emoji_name:123456789>';
      const matches = Array.from(text.matchAll(MessageRegex.EMOJI));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('<a:emoji_name:123456789>');
    });

    it('should match multiple emojis', () => {
      const text = '<:first:111> and <a:second:222>';
      const matches = Array.from(text.matchAll(MessageRegex.EMOJI));

      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('<:first:111>');
      expect(matches[1][0]).toBe('<a:second:222>');
    });

    it('should not match unicode emoji', () => {
      const text = '👍 😀';
      const matches = Array.from(text.matchAll(MessageRegex.EMOJI));

      expect(matches).toHaveLength(0);
    });
  });

  describe('HYPER_LINK', () => {
    it('should match http URL', () => {
      const text = 'Visit http://example.com for more';
      const matches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0][0].trim()).toBe('http://example.com');
    });

    it('should match https URL', () => {
      const text = 'Visit https://example.com for more';
      const matches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0][0].trim()).toBe('https://example.com');
    });

    it('should match URL at start of line', () => {
      const text = 'http://example.com is a website';
      const matches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0][0].trim()).toBe('http://example.com');
    });

    it('should match multiple URLs', () => {
      const text = 'Visit http://first.com and https://second.com';
      const matches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(matches).toHaveLength(2);
      expect(matches[0][0].trim()).toBe('http://first.com');
      expect(matches[1][0].trim()).toBe('https://second.com');
    });

    it('should match URL with query parameters', () => {
      const text = 'Visit https://example.com?param=value&other=123 for more';
      const matches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0][0].trim()).toBe('https://example.com?param=value&other=123');
    });
  });

  describe('LINK (markdown links)', () => {
    it('should match markdown link with name and URL', () => {
      const text = '[Example](http://example.com)';
      const matches = Array.from(text.matchAll(MessageRegex.LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.name).toBe('[Example]');
      expect(matches[0].groups?.url).toBe('(http://example.com');
    });

    it('should match markdown link with just name', () => {
      const text = '[Example]';
      const matches = Array.from(text.matchAll(MessageRegex.LINK));

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.name).toBe('[Example]');
    });

    it('should match multiple markdown links', () => {
      const text = '[First](http://first.com) and [Second](http://second.com)';
      const matches = Array.from(text.matchAll(MessageRegex.LINK));

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.name).toBe('[First]');
      expect(matches[1].groups?.name).toBe('[Second]');
    });
  });

  describe('WINDOWS_INVALID_CHARACTERS', () => {
    it('should match Windows invalid filename characters', () => {
      const invalidChars = '<>:"/\\|?*[]';
      const matches = Array.from(invalidChars.matchAll(MessageRegex.WINDOWS_INVALID_CHARACTERS));

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match left bracket', () => {
      const text = 'file[name]';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name_');
    });

    it('should match right bracket', () => {
      const text = 'file]';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_');
    });

    it('should match less than', () => {
      const text = 'file<name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match greater than', () => {
      const text = 'file>name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match colon', () => {
      const text = 'file:name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match double quote', () => {
      const text = 'file"name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match forward slash', () => {
      const text = 'file/name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match backslash', () => {
      const text = 'file\\name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match pipe', () => {
      const text = 'file|name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match question mark', () => {
      const text = 'file?name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should match asterisk', () => {
      const text = 'file*name';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('file_name');
    });

    it('should not match valid filename characters', () => {
      const text = 'valid_filename-123.txt';
      const result = text.replace(MessageRegex.WINDOWS_INVALID_CHARACTERS, '_');

      expect(result).toBe('valid_filename-123.txt');
    });
  });

  describe('Edge Cases and Combinations', () => {
    it('should match multiple formatting types in one message', () => {
      const text = '**bold** *italic* __underline__ ~~strike~~ ||spoiler||';

      const boldMatches = Array.from(text.matchAll(MessageRegex.BOLD));
      const italicMatches = Array.from(text.matchAll(MessageRegex.ITALICS));
      const underlineMatches = Array.from(text.matchAll(MessageRegex.UNDER_LINE));
      const strikeMatches = Array.from(text.matchAll(MessageRegex.STRIKETHROUGH));
      const spoilerMatches = Array.from(text.matchAll(MessageRegex.SPOILER));

      expect(boldMatches).toHaveLength(1);
      expect(italicMatches).toHaveLength(1);
      expect(underlineMatches).toHaveLength(1);
      expect(strikeMatches).toHaveLength(1);
      expect(spoilerMatches).toHaveLength(1);
    });

    it('should match mixed mentions and links', () => {
      const text = 'Hey <@123> check <#456> and visit https://example.com';

      const userMatches = Array.from(text.matchAll(MessageRegex.USER_MENTION));
      const channelMatches = Array.from(text.matchAll(MessageRegex.CHANNEL_MENTION));
      const linkMatches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(userMatches).toHaveLength(1);
      expect(channelMatches).toHaveLength(1);
      expect(linkMatches).toHaveLength(1);
    });

    it('should handle empty string', () => {
      const text = '';

      const boldMatches = Array.from(text.matchAll(MessageRegex.BOLD));
      const userMatches = Array.from(text.matchAll(MessageRegex.USER_MENTION));

      expect(boldMatches).toHaveLength(0);
      expect(userMatches).toHaveLength(0);
    });

    it('should handle plain text with no formatting', () => {
      const text = 'This is plain text with no special formatting';

      const boldMatches = Array.from(text.matchAll(MessageRegex.BOLD));
      const italicMatches = Array.from(text.matchAll(MessageRegex.ITALICS));
      const userMatches = Array.from(text.matchAll(MessageRegex.USER_MENTION));
      const linkMatches = Array.from(text.matchAll(MessageRegex.HYPER_LINK));

      expect(boldMatches).toHaveLength(0);
      expect(italicMatches).toHaveLength(0);
      expect(userMatches).toHaveLength(0);
      expect(linkMatches).toHaveLength(0);
    });
  });
});
