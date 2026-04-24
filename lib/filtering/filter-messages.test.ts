import { describe, it, expect, beforeEach, vi } from 'vitest';
import { filterMessages } from './filter-messages.ts';
import type { FilterMessagesParams } from './filter-messages.ts';
import { FilterType, FilterName } from '../enum/discrub-enum.ts';
import { MessageType } from '../enum/discord/message-type.ts';
import type { Message, Channel } from '../types/discord-types.ts';
import type { Filter } from '../types/discrub-types.ts';

describe('filterMessages', () => {
  const createMsg = (id: string, content: string, username: string = 'testuser', timestamp?: string): Message => ({
    id,
    channel_id: 'channel-1',
    content,
    timestamp: timestamp || new Date('2024-01-15T12:00:00Z').toISOString(),
    type: 0,
    author: {
      id: 'user-1',
      username,
      discriminator: '0001',
    },
    attachments: [],
  } as Message);

  const createMsgWithAttachment = (id: string, filename: string): Message => {
    const msg = createMsg(id, 'Message with attachment');
    msg.attachments = [{ id: 'att1', filename } as any];
    return msg;
  };

  describe('Text Filtering', () => {
    it('should filter by content', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
        createMsg('3', 'Hello there'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['1', '3']);
    });

    it('should filter by username', () => {
      const messages = [
        createMsg('1', 'Message 1', 'alice'),
        createMsg('2', 'Message 2', 'bob'),
        createMsg('3', 'Message 3', 'alice'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: 'userName' as FilterName,
          filterValue: 'alice',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.author.username)).toEqual(['alice', 'alice']);
    });

    it('should filter by attachment name', () => {
      const messages = [
        createMsgWithAttachment('1', 'document.pdf'),
        createMsgWithAttachment('2', 'image.png'),
        createMsgWithAttachment('3', 'report.pdf'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.ATTACHMENT_NAME,
          filterValue: 'pdf',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['1', '3']);
    });

    it('should perform case-sensitive filtering for content', () => {
      const messages = [
        createMsg('1', 'HELLO WORLD'),
        createMsg('2', 'hello world'),
        createMsg('3', 'Hello World'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'hello',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0].id).toBe('2');
    });
  });

  describe('Date Filtering', () => {
    it('should filter by start time (after)', () => {
      const messages = [
        createMsg('1', 'Old message', 'user', new Date('2024-01-10T12:00:00Z').toISOString()),
        createMsg('2', 'Recent message', 'user', new Date('2024-01-20T12:00:00Z').toISOString()),
        createMsg('3', 'Newer message', 'user', new Date('2024-01-25T12:00:00Z').toISOString()),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: new Date('2024-01-15T00:00:00Z'),
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['2', '3']);
    });

    it('should filter by end time (before)', () => {
      const messages = [
        createMsg('1', 'Old message', 'user', new Date('2024-01-10T12:00:00Z').toISOString()),
        createMsg('2', 'Recent message', 'user', new Date('2024-01-20T12:00:00Z').toISOString()),
        createMsg('3', 'Newer message', 'user', new Date('2024-01-25T12:00:00Z').toISOString()),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.DATE,
          filterName: FilterName.END_TIME,
          filterValue: new Date('2024-01-15T23:59:59Z'),
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['1']);
    });

    it('should filter by date range', () => {
      const messages = [
        createMsg('1', 'Too old', 'user', new Date('2024-01-05T12:00:00Z').toISOString()),
        createMsg('2', 'In range 1', 'user', new Date('2024-01-12T12:00:00Z').toISOString()),
        createMsg('3', 'In range 2', 'user', new Date('2024-01-18T12:00:00Z').toISOString()),
        createMsg('4', 'Too new', 'user', new Date('2024-01-25T12:00:00Z').toISOString()),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: new Date('2024-01-10T00:00:00Z'),
        },
        {
          filterType: FilterType.DATE,
          filterName: FilterName.END_TIME,
          filterValue: new Date('2024-01-20T23:59:59Z'),
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['2', '3']);
    });
  });

  describe('Array Filtering', () => {
    it('should filter by single message type', () => {
      const messages = [
        { ...createMsg('1', 'Regular'), type: 0 },
        { ...createMsg('2', 'Reply'), type: 19 },
        { ...createMsg('3', 'Regular'), type: 0 },
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: [MessageType.DEFAULT],
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['1', '3']);
    });

    it('should filter by multiple message types', () => {
      const messages = [
        { ...createMsg('1', 'Regular'), type: 0 },
        { ...createMsg('2', 'Reply'), type: 19 },
        { ...createMsg('3', 'System'), type: 7 },
        { ...createMsg('4', 'Regular'), type: 0 },
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.ARRAY,
          filterName: FilterName.MESSAGE_TYPE,
          filterValue: [MessageType.DEFAULT, MessageType.REPLY],
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(3);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['1', '2', '4']);
    });
  });

  describe('Multiple Filter Combination', () => {
    it('should apply AND logic for multiple filters', () => {
      const messages = [
        createMsg('1', 'Hello from alice', 'alice'),
        createMsg('2', 'Goodbye from alice', 'alice'),
        createMsg('3', 'Hello from bob', 'bob'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
        {
          filterType: FilterType.TEXT,
          filterName: 'userName' as FilterName,
          filterValue: 'alice',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0].id).toBe('1');
    });

    it('should handle three or more filters', () => {
      const messages = [
        createMsg('1', 'Hello', 'alice', new Date('2024-01-15T12:00:00Z').toISOString()),
        createMsg('2', 'Hello', 'alice', new Date('2024-01-25T12:00:00Z').toISOString()),
        createMsg('3', 'Goodbye', 'alice', new Date('2024-01-20T12:00:00Z').toISOString()),
        createMsg('4', 'Hello', 'bob', new Date('2024-01-20T12:00:00Z').toISOString()),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
        {
          filterType: FilterType.TEXT,
          filterName: 'userName' as FilterName,
          filterValue: 'alice',
        },
        {
          filterType: FilterType.DATE,
          filterName: FilterName.START_TIME,
          filterValue: new Date('2024-01-20T00:00:00Z'),
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0].id).toBe('2');
    });
  });

  describe('Inverse Logic', () => {
    it('should invert filter results', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
        createMsg('3', 'Hello there'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0].id).toBe('2');
    });

    it('should invert multiple filters', () => {
      const messages = [
        createMsg('1', 'Hello from alice', 'alice'),
        createMsg('2', 'Goodbye from alice', 'alice'),
        createMsg('3', 'Hello from bob', 'bob'),
        createMsg('4', 'Goodbye from bob', 'bob'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
        {
          filterType: FilterType.TEXT,
          filterName: 'userName' as FilterName,
          filterValue: 'alice',
        },
        {
          filterType: FilterType.TOGGLE,
          filterName: FilterName.INVERSE,
          filterValue: true,
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      // When inverse is active, each filter is individually inverted
      // Filter 1 inverted: does NOT contain "Hello" -> msg2, msg4
      // Filter 2 inverted: userName is NOT "alice" -> msg3, msg4
      // Since filters use AND logic, only msg4 passes both inverted filters
      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages.map(m => m.id)).toEqual(['4']);
    });
  });

  describe('Selected IDs Filtering', () => {
    it('should filter selected IDs based on results', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
        createMsg('3', 'Hello there'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: ['1', '2', '3'],
      });

      expect(result.selectedMessageIds).toEqual(['1', '3']);
    });

    it('should preserve selected IDs when no filters', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
        createMsg('3', 'Hello there'),
      ];

      const result = filterMessages({
        messages,
        filters: [],
        threads: [],
        selectedMessageIds: ['1', '2'],
      });

      expect(result.filteredMessages).toHaveLength(3);
      expect(result.selectedMessageIds).toEqual(['1', '2']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message array', () => {
      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'Hello',
        },
      ];

      const result = filterMessages({
        messages: [],
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(0);
      expect(result.selectedMessageIds).toHaveLength(0);
    });

    it('should handle empty filters array', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
      ];

      const result = filterMessages({
        messages,
        filters: [],
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(2);
    });

    it('should handle filter with no matches', () => {
      const messages = [
        createMsg('1', 'Hello world'),
        createMsg('2', 'Goodbye world'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: FilterName.CONTENT,
          filterValue: 'NonExistent',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(0);
      expect(result.selectedMessageIds).toHaveLength(0);
    });

    it('should handle messages without authors', () => {
      const messages = [
        { ...createMsg('1', 'Message'), author: undefined } as any,
        createMsg('2', 'Valid message'),
      ];

      const filters: Filter[] = [
        {
          filterType: FilterType.TEXT,
          filterName: 'userName' as FilterName,
          filterValue: 'testuser',
        },
      ];

      const result = filterMessages({
        messages,
        filters,
        threads: [],
        selectedMessageIds: [],
      });

      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0].id).toBe('2');
    });
  });
});
