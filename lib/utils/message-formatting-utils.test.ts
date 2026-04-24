import { describe, it, expect } from 'vitest';
import { parseSpecialFormatting } from './message-formatting-utils.ts';

describe('message-formatting-utils', () => {
  describe('parseSpecialFormatting', () => {
    const createContext = (
      userMap: Record<string, { userName?: string | null; displayName?: string | null }> = {},
      guildRoles: Array<{ id: string; name: string }> = []
    ) => ({ userMap, guildRoles });

    describe('User Mentions', () => {
      it('should parse user mentions with userName', () => {
        const content = 'Hello <@123>';
        const context = createContext({
          '123': { userName: 'alice' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(1);
        expect(result.userMention[0]).toEqual({
          raw: '<@123>',
          userName: 'alice',
          id: '123',
        });
      });

      it('should parse user mentions with displayName priority', () => {
        const content = 'Hello <@123>';
        const context = createContext({
          '123': { userName: 'alice', displayName: 'Alice Smith' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention[0].userName).toBe('Alice Smith');
      });

      it('should parse user mentions with role name priority', () => {
        const content = 'Hello <@123>';
        const context = createContext(
          { '123': { userName: 'alice', displayName: 'Alice Smith' } },
          [{ id: '123', name: '@everyone' }]
        );

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention[0].userName).toBe('@everyone');
      });

      it('should handle user mentions with ! prefix', () => {
        const content = 'Hey <@!456>';
        const context = createContext({
          '456': { userName: 'bob' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(1);
        expect(result.userMention[0].id).toBe('456');
      });

      it('should handle user mentions with & prefix (role)', () => {
        const content = 'Hey <@&789>';
        const context = createContext({}, [{ id: '789', name: 'Moderator' }]);

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(1);
        expect(result.userMention[0].userName).toBe('Moderator');
      });

      it('should handle unknown user mentions', () => {
        const content = 'Hello <@999>';
        const context = createContext({});

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention[0].userName).toBe('Not Found');
      });

      it('should handle multiple user mentions', () => {
        const content = '<@123> and <@456> are here';
        const context = createContext({
          '123': { userName: 'alice' },
          '456': { userName: 'bob' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(2);
        expect(result.userMention[0].userName).toBe('alice');
        expect(result.userMention[1].userName).toBe('bob');
      });
    });

    describe('Channel Mentions', () => {
      it('should parse channel mentions', () => {
        const content = 'Check out <#123456>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.channel).toHaveLength(1);
        expect(result.channel[0]).toEqual({
          raw: '<#123456>',
          channelId: '123456',
        });
      });

      it('should parse multiple channel mentions', () => {
        const content = '<#111> and <#222>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.channel).toHaveLength(2);
        expect(result.channel[0].channelId).toBe('111');
        expect(result.channel[1].channelId).toBe('222');
      });
    });

    describe('Text Formatting', () => {
      it('should parse bold text', () => {
        const content = 'This is **bold** text';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.bold).toHaveLength(1);
        expect(result.bold[0]).toEqual({
          raw: '**bold**',
          text: 'bold',
        });
      });

      it('should parse italic text with underscore', () => {
        const content = 'This is _italic_ text';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.italics).toHaveLength(1);
        expect(result.italics[0].text).toBe('italic');
      });

      it('should parse italic text with asterisk', () => {
        const content = 'This is *italic* text';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.italics).toHaveLength(1);
        expect(result.italics[0].text).toBe('italic');
      });

      it('should parse underlined text', () => {
        const content = 'This is __underlined__ text';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.underLine).toHaveLength(1);
        expect(result.underLine[0]).toEqual({
          raw: '__underlined__',
          text: 'underlined',
        });
      });

      it('should parse inline code', () => {
        const content = 'Use `console.log()` here';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.quote).toHaveLength(1);
        expect(result.quote[0]).toEqual({
          raw: '`console.log()`',
          text: 'console.log()',
        });
      });

      it('should parse code blocks', () => {
        const content = '```javascript\nconst x = 1;```';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.code).toHaveLength(1);
        expect(result.code[0].text).toBe('javascript\nconst x = 1;');
      });
    });

    describe('Links', () => {
      it('should parse markdown links', () => {
        const content = '[Click here](https://example.com)';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.link).toHaveLength(1);
        expect(result.link[0]).toEqual({
          raw: '[Click here](https://example.com)',
          text: 'Click here',
          url: 'https://example.com',
          description: '',
        });
      });

      it('should parse markdown links without description', () => {
        const content = '[Click here](https://example.com)';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.link[0].description).toBe('');
      });

      it('should parse hyperlinks', () => {
        const content = 'Visit https://example.com for more';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.hyperLink).toHaveLength(1);
        expect(result.hyperLink[0].raw).toBe('https://example.com');
      });

      it('should parse http hyperlinks', () => {
        const content = 'Check http://example.com now';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.hyperLink).toHaveLength(1);
        expect(result.hyperLink[0].raw).toBe('http://example.com');
      });
    });

    describe('Emojis', () => {
      it('should parse custom emojis', () => {
        const content = 'Hello <:smile:123456>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.emoji).toHaveLength(1);
        expect(result.emoji[0]).toEqual({
          raw: '<:smile:123456>',
          name: ':smile:',
          id: '123456',
        });
      });

      it('should parse animated emojis', () => {
        const content = 'Dance <a:party:789012>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.emoji).toHaveLength(1);
        expect(result.emoji[0]).toEqual({
          raw: '<a:party:789012>',
          name: ':party:',
          id: '789012',
        });
      });

      it('should parse multiple emojis', () => {
        const content = '<:smile:111> <a:dance:222> <:wave:333>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.emoji).toHaveLength(3);
        expect(result.emoji[0].name).toBe(':smile:');
        expect(result.emoji[1].name).toBe(':dance:');
        expect(result.emoji[2].name).toBe(':wave:');
      });
    });

    describe('Mixed Content', () => {
      it('should parse multiple formatting types in one message', () => {
        const content = 'Hey <@123>, check **this** out: <#456> https://example.com';
        const context = createContext({
          '123': { userName: 'alice' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(1);
        expect(result.channel).toHaveLength(1);
        expect(result.bold).toHaveLength(1);
        expect(result.hyperLink).toHaveLength(1);
      });

      it('should parse complex formatted message', () => {
        const content = '<@123> said: **Important!** Check <#456> and visit [docs](https://docs.com) `now`';
        const context = createContext({
          '123': { userName: 'bob' },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(1);
        expect(result.bold).toHaveLength(1);
        expect(result.channel).toHaveLength(1);
        expect(result.link).toHaveLength(1);
        expect(result.quote).toHaveLength(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty content', () => {
        const content = '';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(0);
        expect(result.channel).toHaveLength(0);
        expect(result.bold).toHaveLength(0);
        expect(result.italics).toHaveLength(0);
        expect(result.underLine).toHaveLength(0);
        expect(result.code).toHaveLength(0);
        expect(result.link).toHaveLength(0);
        expect(result.quote).toHaveLength(0);
        expect(result.hyperLink).toHaveLength(0);
        expect(result.emoji).toHaveLength(0);
      });

      it('should handle plain text with no formatting', () => {
        const content = 'This is just plain text';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention).toHaveLength(0);
        expect(result.bold).toHaveLength(0);
        expect(result.italics).toHaveLength(0);
      });

      it('should handle user with null values', () => {
        const content = 'Hello <@123>';
        const context = createContext({
          '123': { userName: null, displayName: null },
        });

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention[0].userName).toBe('Not Found');
      });

      it('should handle empty userMap and guildRoles', () => {
        const content = '<@123> in <#456>';
        const context = createContext();

        const result = parseSpecialFormatting(content, context);

        expect(result.userMention[0].userName).toBe('Not Found');
        expect(result.channel[0].channelId).toBe('456');
      });
    });
  });
});
