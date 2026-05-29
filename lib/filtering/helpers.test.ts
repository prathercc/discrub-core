import { describe, it, expect } from 'vitest';
import {
  applyInverseLogic,
  filterByTimestamp,
  TextExtractors,
  createTextContainsCheck,
  filterByTextContent,
  filterMessageType,
  filterThread,
  countActiveFilters,
  countTotalFilters,
  hasActiveSearchFilters,
} from './helpers.ts';
import { IsPinnedType } from '../enum/discord-enum.ts';
import type { SearchCriteria } from '../types/discrub-types.ts';
import type { Message, Channel } from '../types/discord-types.ts';
import { MessageCategory, MessageType } from '../enum/discord-enum.ts';

describe('filtering/helpers', () => {
  const createMsg = (
    id: string,
    content: string,
    timestamp: string = new Date('2024-01-15T12:00:00Z').toISOString(),
    channelId: string = 'channel-1'
  ): Message => ({
    id,
    channel_id: channelId,
    content,
    timestamp,
    type: 0,
    author: {
      id: 'user-1',
      username: 'testuser',
      discriminator: '0001',
    },
    attachments: [],
    embeds: [],
  } as Message);

  describe('applyInverseLogic', () => {
    it('should return matches when inverse is false', () => {
      expect(applyInverseLogic(true, false)).toBe(true);
      expect(applyInverseLogic(false, false)).toBe(false);
    });

    it('should return inverted matches when inverse is true', () => {
      expect(applyInverseLogic(true, true)).toBe(false);
      expect(applyInverseLogic(false, true)).toBe(true);
    });
  });

  describe('filterByTimestamp', () => {
    it('should include message after start time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-20T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T00:00:00Z');

      const result = filterByTimestamp(filterDate, message, false, 'after');

      expect(result).toBe(true);
    });

    it('should exclude message before start time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-10T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T00:00:00Z');

      const result = filterByTimestamp(filterDate, message, false, 'after');

      expect(result).toBe(false);
    });

    it('should include message on exact start time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-15T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T12:00:00Z');

      const result = filterByTimestamp(filterDate, message, false, 'after');

      expect(result).toBe(true);
    });

    it('should include message before end time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-10T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T23:59:59Z');

      const result = filterByTimestamp(filterDate, message, false, 'before');

      expect(result).toBe(true);
    });

    it('should exclude message after end time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-20T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T23:59:59Z');

      const result = filterByTimestamp(filterDate, message, false, 'before');

      expect(result).toBe(false);
    });

    it('should include message on exact end time', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-15T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T12:00:00Z');

      const result = filterByTimestamp(filterDate, message, false, 'before');

      expect(result).toBe(true);
    });

    it('should apply inverse logic for after comparison', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-20T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T00:00:00Z');

      const result = filterByTimestamp(filterDate, message, true, 'after');

      expect(result).toBe(false);
    });

    it('should apply inverse logic for before comparison', () => {
      const message = createMsg('1', 'Test', new Date('2024-01-10T12:00:00Z').toISOString());
      const filterDate = new Date('2024-01-15T23:59:59Z');

      const result = filterByTimestamp(filterDate, message, true, 'before');

      expect(result).toBe(false);
    });
  });

  describe('TextExtractors', () => {
    describe('property', () => {
      it('should extract message content', () => {
        const message = createMsg('1', 'Hello world');
        const extractor = TextExtractors.property('content');

        const result = extractor(message);

        expect(result).toBe('Hello world');
      });

      it('should extract username from author', () => {
        const message = createMsg('1', 'Test');
        const extractor = TextExtractors.property('userName');

        const result = extractor(message);

        expect(result).toBe('testuser');
      });

      it('should return empty string for missing property', () => {
        const message = createMsg('1', 'Test');
        const extractor = TextExtractors.property('nonexistent' as any);

        const result = extractor(message);

        expect(result).toBe('');
      });

      it('should handle missing author', () => {
        const message = createMsg('1', 'Test');
        message.author = undefined as any;
        const extractor = TextExtractors.property('userName');

        const result = extractor(message);

        expect(result).toBe('');
      });
    });

    describe('attachments', () => {
      it('should extract attachment filenames', () => {
        const message = createMsg('1', 'Test');
        message.attachments = [
          { id: '1', filename: 'image.png' } as any,
          { id: '2', filename: 'document.pdf' } as any,
        ];

        const result = TextExtractors.attachments(message);

        expect(result).toBe('image.png,document.pdf');
      });

      it('should return empty string for no attachments', () => {
        const message = createMsg('1', 'Test');

        const result = TextExtractors.attachments(message);

        expect(result).toBe('');
      });
    });

    describe('contentAndEmbeds', () => {
      it('should extract message content', () => {
        const message = createMsg('1', 'Hello world');

        const result = TextExtractors.contentAndEmbeds(message);

        expect(result).toContain('Hello world');
      });

      it('should extract rich embed fields', () => {
        const message = createMsg('1', 'Test');
        message.embeds = [
          {
            type: 'rich',
            title: 'Embed Title',
            description: 'Embed Description',
            author: {
              name: 'Author Name',
              url: 'https://author.com',
            },
            footer: {
              text: 'Footer Text',
            },
            fields: [
              { name: 'Field 1', value: 'Value 1' },
              { name: 'Field 2', value: 'Value 2' },
            ],
          } as any,
        ];

        const result = TextExtractors.contentAndEmbeds(message);

        expect(result).toContain('Test');
        expect(result).toContain('Embed Title');
        expect(result).toContain('Embed Description');
        expect(result).toContain('Author Name');
        expect(result).toContain('https://author.com');
        expect(result).toContain('Footer Text');
        expect(result).toContain('Field 1');
        expect(result).toContain('Value 1');
        expect(result).toContain('Field 2');
        expect(result).toContain('Value 2');
      });

      it('should skip non-rich embeds', () => {
        const message = createMsg('1', 'Test');
        message.embeds = [
          {
            type: 'image',
            url: 'https://example.com/image.png',
          } as any,
        ];

        const result = TextExtractors.contentAndEmbeds(message);

        expect(result).toEqual(['Test']);
      });

      it('should filter out null/undefined embed values', () => {
        const message = createMsg('1', 'Test');
        message.embeds = [
          {
            type: 'rich',
            title: null,
            description: undefined,
            author: {
              name: 'Author Name',
            },
          } as any,
        ];

        const result = TextExtractors.contentAndEmbeds(message);

        expect(result).toContain('Test');
        expect(result).toContain('Author Name');
        expect(result.length).toBe(2);
      });
    });
  });

  describe('createTextContainsCheck', () => {
    it('should find text in string (case-sensitive)', () => {
      const result = createTextContainsCheck('hello', 'Say hello world', true);

      expect(result).toBe(true);
    });

    it('should not find mismatched case (case-sensitive)', () => {
      const result = createTextContainsCheck('HELLO', 'Say hello world', true);

      expect(result).toBe(false);
    });

    it('should find text regardless of case (case-insensitive)', () => {
      const result = createTextContainsCheck('HELLO', 'Say hello world', false);

      expect(result).toBe(true);
    });

    it('should handle array of search values', () => {
      const result = createTextContainsCheck(['foo', 'bar'], 'This has bar in it', true);

      expect(result).toBe(true);
    });

    it('should return false when no match', () => {
      const result = createTextContainsCheck(['foo', 'baz'], 'This has bar in it', true);

      expect(result).toBe(false);
    });

    it('should handle empty search values', () => {
      const result = createTextContainsCheck([], 'Some text', true);

      expect(result).toBe(false);
    });
  });

  describe('filterByTextContent', () => {
    it('should match content with property extractor', () => {
      const message = createMsg('1', 'Hello world');
      const extractor = TextExtractors.property('content');

      const result = filterByTextContent('Hello', message, false, extractor, true);

      expect(result).toBe(true);
    });

    it('should not match when text not found', () => {
      const message = createMsg('1', 'Hello world');
      const extractor = TextExtractors.property('content');

      const result = filterByTextContent('goodbye', message, false, extractor, true);

      expect(result).toBe(false);
    });

    it('should match case-insensitively', () => {
      const message = createMsg('1', 'Hello world');
      const extractor = TextExtractors.property('content');

      const result = filterByTextContent('HELLO', message, false, extractor, false);

      expect(result).toBe(true);
    });

    it('should apply inverse logic', () => {
      const message = createMsg('1', 'Hello world');
      const extractor = TextExtractors.property('content');

      const result = filterByTextContent('Hello', message, true, extractor, true);

      expect(result).toBe(false);
    });

    it('should handle array values', () => {
      const message = createMsg('1', 'Hello world');
      const extractor = TextExtractors.property('content');

      const result = filterByTextContent(['goodbye', 'Hello'], message, false, extractor, true);

      expect(result).toBe(true);
    });

    it('should handle array extractor results', () => {
      const message = createMsg('1', 'Test');
      message.embeds = [
        {
          type: 'rich',
          title: 'Important Title',
        } as any,
      ];

      const result = filterByTextContent('Important', message, false, TextExtractors.contentAndEmbeds, true);

      expect(result).toBe(true);
    });
  });

  describe('filterMessageType', () => {
    it('should match message type', () => {
      const message = createMsg('1', 'Test');
      message.type = 0;

      const result = filterMessageType(['0'], message, false, []);

      expect(result).toBe(true);
    });

    it('should match multiple message types', () => {
      const message = createMsg('1', 'Test');
      message.type = 19;

      const result = filterMessageType(['0', '19', '20'], message, false, []);

      expect(result).toBe(true);
    });

    it('should not match different message type', () => {
      const message = createMsg('1', 'Test');
      message.type = 7;

      const result = filterMessageType(['0', '19'], message, false, []);

      expect(result).toBe(false);
    });

    it('should match pinned messages', () => {
      const message = createMsg('1', 'Test');
      message.pinned = true;

      const result = filterMessageType([MessageCategory.PINNED], message, false, []);

      expect(result).toBe(true);
    });

    it('should match messages with reactions', () => {
      const message = createMsg('1', 'Test');
      message.reactions = [
        { emoji: { name: '👍' }, count: 5 } as any,
      ];

      const result = filterMessageType([MessageCategory.REACTIONS], message, false, []);

      expect(result).toBe(true);
    });

    it('should match thread messages', () => {
      const message = createMsg('1', 'Test', undefined, 'thread-123');
      const threads: Channel[] = [
        { id: 'thread-123', name: 'Test Thread' } as Channel,
      ];

      const result = filterMessageType([MessageCategory.THREAD], message, false, threads);

      expect(result).toBe(true);
    });

    it('should match thread starter messages', () => {
      const message = createMsg('1', 'Test');
      message.thread = { id: 'thread-123' } as any;

      const result = filterMessageType([MessageCategory.THREAD_STARTER], message, false, []);

      expect(result).toBe(true);
    });

    it('should apply inverse logic', () => {
      const message = createMsg('1', 'Test');
      message.type = 0;

      const result = filterMessageType(['0'], message, true, []);

      expect(result).toBe(false);
    });

    it('should handle no matches', () => {
      const message = createMsg('1', 'Test');
      message.type = 0;
      message.pinned = false;

      const result = filterMessageType(['19', MessageCategory.PINNED], message, false, []);

      expect(result).toBe(false);
    });
  });

  describe('filterThread', () => {
    it('should match message in thread by channel_id', () => {
      const message = createMsg('1', 'Test', undefined, 'thread-123');

      const result = filterThread('thread-123', message, false);

      expect(result).toBe(true);
    });

    it('should match message in thread by thread.id', () => {
      const message = createMsg('1', 'Test');
      message.thread = { id: 'thread-456' } as any;

      const result = filterThread('thread-456', message, false);

      expect(result).toBe(true);
    });

    it('should not match message in different thread', () => {
      const message = createMsg('1', 'Test', undefined, 'thread-123');

      const result = filterThread('thread-456', message, false);

      expect(result).toBe(false);
    });

    it('should apply inverse logic', () => {
      const message = createMsg('1', 'Test', undefined, 'thread-123');

      const result = filterThread('thread-123', message, true);

      expect(result).toBe(false);
    });

    it('should handle message without thread', () => {
      const message = createMsg('1', 'Test', undefined, 'channel-1');

      const result = filterThread('thread-123', message, false);

      expect(result).toBe(false);
    });
  });

  describe('countActiveFilters / countTotalFilters / hasActiveSearchFilters (#195 cluster A)', () => {
    const empty = (): SearchCriteria => ({}) as SearchCriteria;

    it('returns 0 for an empty criteria object', () => {
      expect(countActiveFilters(empty())).toBe(0);
      expect(hasActiveSearchFilters(empty())).toBe(false);
    });

    it('returns 0 for null/undefined in hasActiveSearchFilters', () => {
      expect(hasActiveSearchFilters(null)).toBe(false);
      expect(hasActiveSearchFilters(undefined)).toBe(false);
    });

    it('counts searchMessageContent as 1 when set', () => {
      expect(countActiveFilters({ searchMessageContent: 'hello' } as SearchCriteria)).toBe(1);
    });

    it('counts each userId as 1 (multi-user filter)', () => {
      expect(countActiveFilters({ userIds: ['u1', 'u2', 'u3'] } as SearchCriteria)).toBe(3);
    });

    it('counts each selectedHasType as 1', () => {
      expect(countActiveFilters({ selectedHasTypes: ['image', 'link'] } as any)).toBe(2);
    });

    it('counts both date range bounds independently', () => {
      expect(countActiveFilters({ searchAfterDate: '2026-01-01' } as any)).toBe(1);
      expect(countActiveFilters({ searchBeforeDate: '2026-02-01' } as any)).toBe(1);
      expect(
        countActiveFilters({ searchAfterDate: 'x', searchBeforeDate: 'y' } as any),
      ).toBe(2);
    });

    it('counts isPinned only when not UNSET', () => {
      expect(countActiveFilters({ isPinned: IsPinnedType.UNSET } as any)).toBe(0);
      expect(countActiveFilters({ isPinned: IsPinnedType.YES } as any)).toBe(1);
      expect(countActiveFilters({ isPinned: IsPinnedType.NO } as any)).toBe(1);
      // Explicitly undefined also counts as 0.
      expect(countActiveFilters({ isPinned: undefined } as any)).toBe(0);
    });

    it('counts authorType as 1 when set', () => {
      expect(countActiveFilters({ authorType: 'user' } as any)).toBe(1);
    });

    it('counts each mentionId as 1', () => {
      expect(countActiveFilters({ mentionIds: ['m1', 'm2'] } as any)).toBe(2);
    });

    it('does not count empty arrays', () => {
      expect(countActiveFilters({ userIds: [] } as any)).toBe(0);
      expect(countActiveFilters({ selectedHasTypes: [] } as any)).toBe(0);
      expect(countActiveFilters({ mentionIds: [] } as any)).toBe(0);
    });

    it('aggregates a mixed criteria correctly', () => {
      const c: SearchCriteria = {
        searchMessageContent: 'hi',
        userIds: ['u1'],
        selectedHasTypes: ['image'],
        searchAfterDate: 'd',
        isPinned: IsPinnedType.YES,
        authorType: 'user',
        mentionIds: ['m1', 'm2'],
      } as any;
      // 1 + 1 + 1 + 1 + 1 + 1 + 2 = 8
      expect(countActiveFilters(c)).toBe(8);
      expect(hasActiveSearchFilters(c)).toBe(true);
    });

    it('countTotalFilters sums search + refine', () => {
      const search = { searchMessageContent: 'a', userIds: ['u1'] } as any;
      const refine = { selectedHasTypes: ['image', 'video'] } as any;
      expect(countTotalFilters(search, refine)).toBe(4); // 2 + 2
    });
  });
});
