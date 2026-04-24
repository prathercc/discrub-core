import { describe, it, expect } from 'vitest';
import { FilterHandlers } from './handlers.ts';
import { FilterType, FilterName } from '../enum/discrub-enum.ts';
import type { Filter } from '../types/discrub-types.ts';
import type { Message, Channel } from '../types/discord-types.ts';

describe('FilterHandlers', () => {
  const createMsg = (
    id: string,
    content: string,
    username: string = 'testuser',
    timestamp?: string,
    channelId: string = 'channel-1'
  ): Message => ({
    id,
    channel_id: channelId,
    content,
    timestamp: timestamp || new Date('2024-01-15T12:00:00Z').toISOString(),
    type: 0,
    author: {
      id: 'user-1',
      username,
      discriminator: '0001',
    },
    attachments: [],
    embeds: [],
  } as Message);

  describe('Text Handler', () => {
    it('should extract and match content', () => {
      const message = createMsg('1', 'Hello world');
      const filter: Filter = {
        filterType: FilterType.TEXT,
        filterName: FilterName.CONTENT,
        filterValue: 'Hello',
      };

      const handler = FilterHandlers[FilterType.TEXT];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);
    });

    it('should extract and match attachment names', () => {
      const message = createMsg('1', 'Message with attachment');
      message.attachments = [
        { id: 'att1', filename: 'document.pdf' } as any,
        { id: 'att2', filename: 'image.png' } as any,
      ];

      const filter: Filter = {
        filterType: FilterType.TEXT,
        filterName: FilterName.ATTACHMENT_NAME,
        filterValue: 'pdf',
      };

      const handler = FilterHandlers[FilterType.TEXT];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);
    });

    it('should extract and match usernames', () => {
      const message = createMsg('1', 'Test message', 'alice');
      const filter: Filter = {
        filterType: FilterType.TEXT,
        filterName: 'userName' as FilterName,
        filterValue: 'alice',
      };

      const handler = FilterHandlers[FilterType.TEXT];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);
    });
  });

  describe('Date Handler', () => {
    it('should compare start time (after)', () => {
      const message = createMsg('1', 'Recent message', 'user', new Date('2024-01-20T12:00:00Z').toISOString());
      const filter: Filter = {
        filterType: FilterType.DATE,
        filterName: FilterName.START_TIME,
        filterValue: new Date('2024-01-15T00:00:00Z'),
      };

      const handler = FilterHandlers[FilterType.DATE];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);

      // Test message before start time
      const oldMessage = createMsg('2', 'Old message', 'user', new Date('2024-01-10T12:00:00Z').toISOString());
      const resultOld = handler(filter, oldMessage, false, []);
      expect(resultOld).toBe(false);
    });

    it('should compare end time (before)', () => {
      const message = createMsg('1', 'Old message', 'user', new Date('2024-01-10T12:00:00Z').toISOString());
      const filter: Filter = {
        filterType: FilterType.DATE,
        filterName: FilterName.END_TIME,
        filterValue: new Date('2024-01-15T23:59:59Z'),
      };

      const handler = FilterHandlers[FilterType.DATE];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);

      // Test message after end time
      const newMessage = createMsg('2', 'New message', 'user', new Date('2024-01-20T12:00:00Z').toISOString());
      const resultNew = handler(filter, newMessage, false, []);
      expect(resultNew).toBe(false);
    });
  });

  describe('Array Handler', () => {
    it('should match message types', () => {
      const message = createMsg('1', 'Regular message');
      message.type = 0;

      const filter: Filter = {
        filterType: FilterType.ARRAY,
        filterName: FilterName.MESSAGE_TYPE,
        filterValue: ['0'],
      };

      const handler = FilterHandlers[FilterType.ARRAY];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);
    });

    it('should handle multiple values', () => {
      const message = createMsg('1', 'Reply message');
      message.type = 19;

      const filter: Filter = {
        filterType: FilterType.ARRAY,
        filterName: FilterName.MESSAGE_TYPE,
        filterValue: ['0', '19'],
      };

      const handler = FilterHandlers[FilterType.ARRAY];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);

      // Test message type not in filter
      message.type = 7;
      const resultNotMatch = handler(filter, message, false, []);
      expect(resultNotMatch).toBe(false);
    });
  });

  describe('Thread Handler', () => {
    it('should check thread membership', () => {
      const message = createMsg('1', 'Thread message', 'user', undefined, 'thread-1');
      const filter: Filter = {
        filterType: FilterType.THREAD,
        filterName: FilterName.THREAD,
        filterValue: 'thread-1',
      };

      const handler = FilterHandlers[FilterType.THREAD];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);

      // Test message not in thread
      const nonThreadMessage = createMsg('2', 'Regular message', 'user', undefined, 'channel-1');
      const resultNotMatch = handler(filter, nonThreadMessage, false, []);
      expect(resultNotMatch).toBe(false);
    });
  });

  describe('Toggle Handler', () => {
    it('should always return true (toggle filters do not filter messages)', () => {
      const message = createMsg('1', 'Test message');
      const filter: Filter = {
        filterType: FilterType.TOGGLE,
        filterName: FilterName.INVERSE,
        filterValue: true,
      };

      const handler = FilterHandlers[FilterType.TOGGLE];
      const result = handler(filter, message, false, []);

      expect(result).toBe(true);
    });
  });
});
