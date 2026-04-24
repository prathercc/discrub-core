import { describe, it, expect } from 'vitest';
import { prepareExportData } from './export-data-service.ts';
import type { ExportPaginationConfig } from './export-data-service.ts';
import type { Message, Channel } from '../types/discord-types.ts';

// Lightweight message factory
function createMsg(id: string, channelId: string): Message {
  return {
    id,
    channel_id: channelId,
    content: `Message ${id}`,
    timestamp: new Date().toISOString(),
    author: {
      id: 'user-1',
      username: 'testuser',
      discriminator: '0001',
    },
  } as Message;
}

describe('ExportDataService', () => {
  const baseConfig: ExportPaginationConfig = {
    messages: [],
    messagesPerPage: 100,
    entityName: 'test-channel',
    entityMainDirectory: 'exports/test-guild',
    format: 'html',
    threads: [],
    separateThreads: false,
  };

  describe('Export Data Preparation', () => {
    it('should create single page for small dataset', () => {
      const messages = [createMsg('1', 'ch1'), createMsg('2', 'ch1'), createMsg('3', 'ch1')];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        messagesPerPage: 100,
      };

      const result = prepareExportData(config);

      expect(result.mainPages).toHaveLength(1);
      expect(result.mainPages[0].messages).toHaveLength(3);
      expect(result.mainPages[0].pageNumber).toBe(1);
      expect(result.mainPages[0].filePath).toBe('exports/test-guild/test-channel_page_1.html');
      expect(result.threadExports).toHaveLength(0);
      expect(result.totalPages).toBe(1);
    });

    it('should create multiple pages for large dataset', () => {
      const messages = [
        createMsg('1', 'ch1'), createMsg('2', 'ch1'), createMsg('3', 'ch1'),
        createMsg('4', 'ch1'), createMsg('5', 'ch1'),
      ];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        messagesPerPage: 2,
      };

      const result = prepareExportData(config);

      expect(result.mainPages).toHaveLength(3);
      expect(result.mainPages[0].messages).toHaveLength(2);
      expect(result.mainPages[1].messages).toHaveLength(2);
      expect(result.mainPages[2].messages).toHaveLength(1);
      expect(result.totalPages).toBe(3);
    });

    it('should sanitize entity name in file path', () => {
      const messages = [createMsg('1', 'ch1')];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        entityName: 'test/channel:name',
      };

      const result = prepareExportData(config);

      expect(result.mainPages[0].filePath).not.toContain('/channel');
      expect(result.mainPages[0].filePath).not.toContain(':');
    });
  });

  describe('Thread Separation', () => {
    it('should skip thread exports when disabled', () => {
      const mainMsg = createMsg('1', 'ch1');
      const threadMsg = createMsg('2', 'thread1');
      threadMsg.thread = { id: 'thread1', name: 'Thread 1' };

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg, threadMsg],
        threads: [thread],
        separateThreads: false,
      };

      const result = prepareExportData(config);

      expect(result.mainPages).toHaveLength(1);
      expect(result.mainPages[0].messages).toHaveLength(2);
      expect(result.threadExports).toHaveLength(0);
    });

    it('should separate thread messages when enabled', () => {
      const mainMsg = createMsg('1', 'ch1');
      const threadStarter = createMsg('2', 'ch1');
      threadStarter.thread = { id: 'thread1', name: 'Thread 1' };
      const threadReply = createMsg('3', 'thread1');

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg, threadStarter, threadReply],
        threads: [thread],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // Main messages should include non-thread messages AND thread starters
      expect(result.mainPages).toHaveLength(1);
      expect(result.mainPages[0].messages).toHaveLength(2);
      const mainIds = result.mainPages[0].messages.map(m => m.id);
      expect(mainIds).toContain('1');
      expect(mainIds).toContain('2');

      // Thread should include only replies (not the starter)
      expect(result.threadExports).toHaveLength(1);
      expect(result.threadExports[0].thread.id).toBe('thread1');
      expect(result.threadExports[0].pages).toHaveLength(1);
      expect(result.threadExports[0].pages[0].messages).toHaveLength(1);
      expect(result.threadExports[0].pages[0].messages[0].id).toBe('3');
    });

    it('should handle multiple threads', () => {
      const mainMsg = createMsg('1', 'ch1');
      const thread1Starter = createMsg('2', 'ch1');
      thread1Starter.thread = { id: 'thread1', name: 'Thread 1' };
      const thread1Reply = createMsg('3', 'thread1');
      const thread2Starter = createMsg('4', 'ch1');
      thread2Starter.thread = { id: 'thread2', name: 'Thread 2' };
      const thread2Reply = createMsg('5', 'thread2');

      const thread1: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const thread2: Channel = {
        id: 'thread2',
        type: 11,
        name: 'Thread 2',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg, thread1Starter, thread1Reply, thread2Starter, thread2Reply],
        threads: [thread1, thread2],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // Main messages: 1 regular + 2 thread starters
      expect(result.mainPages[0].messages).toHaveLength(3);

      // Two thread exports (replies only)
      expect(result.threadExports).toHaveLength(2);
      expect(result.threadExports[0].pages[0].messages).toHaveLength(1);
      expect(result.threadExports[0].pages[0].messages[0].id).toBe('3');
      expect(result.threadExports[1].pages[0].messages).toHaveLength(1);
      expect(result.threadExports[1].pages[0].messages[0].id).toBe('5');
    });

    it('should set thread numbering correctly', () => {
      const thread1Starter = createMsg('1', 'ch1');
      thread1Starter.thread = { id: 'thread1', name: 'Thread 1' };
      const thread1Reply = createMsg('1r', 'thread1');
      const thread2Starter = createMsg('2', 'ch1');
      thread2Starter.thread = { id: 'thread2', name: 'Thread 2' };
      const thread2Reply = createMsg('2r', 'thread2');

      const thread1: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const thread2: Channel = {
        id: 'thread2',
        type: 11,
        name: 'Thread 2',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [thread1Starter, thread1Reply, thread2Starter, thread2Reply],
        threads: [thread1, thread2],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      expect(result.threadExports[0].threadNumber).toBe(1);
      expect(result.threadExports[0].totalThreads).toBe(2);
      expect(result.threadExports[1].threadNumber).toBe(2);
      expect(result.threadExports[1].totalThreads).toBe(2);
    });

    it('should keep thread starter in main only, replies in thread only', () => {
      const mainMsg = createMsg('1', 'ch1');
      const threadStarter = createMsg('2', 'ch1');
      threadStarter.thread = { id: 'thread1', name: 'Thread 1' };
      const threadReply = createMsg('3', 'thread1');

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg, threadStarter, threadReply],
        threads: [thread],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // Thread starter appears in main (for thread banner link)
      const mainIds = result.mainPages[0].messages.map(m => m.id);
      expect(mainIds).toContain('2');

      // Thread starter does NOT appear in thread export (avoids duplicate)
      const threadIds = result.threadExports[0].pages[0].messages.map(m => m.id);
      expect(threadIds).not.toContain('2');

      // Thread reply is only in thread export
      expect(mainIds).not.toContain('3');
      expect(threadIds).toContain('3');
    });

    it('should handle messages with channel_id matching thread id', () => {
      const threadMsg = createMsg('1', 'thread1'); // channel_id is 'thread1'

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [threadMsg],
        threads: [thread],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // Message should be in thread export
      expect(result.threadExports).toHaveLength(1);
      expect(result.threadExports[0].pages[0].messages).toHaveLength(1);
      expect(result.threadExports[0].pages[0].messages[0].id).toBe('1');

      // Main messages should be empty
      expect(result.mainPages).toHaveLength(0);
    });

    it('should paginate thread messages', () => {
      const starter = createMsg('0', 'ch1');
      starter.thread = { id: 'thread1', name: 'Thread 1' };
      const replies = [
        createMsg('1', 'thread1'),
        createMsg('2', 'thread1'),
        createMsg('3', 'thread1'),
        createMsg('4', 'thread1'),
        createMsg('5', 'thread1'),
      ];

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [starter, ...replies],
        threads: [thread],
        separateThreads: true,
        messagesPerPage: 2,
      };

      const result = prepareExportData(config);

      // Thread has 5 replies only (starter stays in main)
      expect(result.threadExports).toHaveLength(1);
      expect(result.threadExports[0].pages).toHaveLength(3);
      expect(result.threadExports[0].pages[0].messages).toHaveLength(2);
      expect(result.threadExports[0].pages[1].messages).toHaveLength(2);
      expect(result.threadExports[0].pages[2].messages).toHaveLength(1);
    });

    it('should calculate total pages including thread pages', () => {
      const mainMsg1 = createMsg('1', 'ch1');
      const mainMsg2 = createMsg('2', 'ch1');
      const threadStarter = createMsg('3', 'ch1');
      threadStarter.thread = { id: 'thread1', name: 'Thread 1' };
      const threadReply = createMsg('4', 'thread1');

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg1, mainMsg2, threadStarter, threadReply],
        threads: [thread],
        separateThreads: true,
        messagesPerPage: 1,
      };

      const result = prepareExportData(config);

      // totalPages only counts main pages (threads are separate files)
      // Main has: mainMsg1, mainMsg2, threadStarter = 3 pages
      expect(result.totalPages).toBe(3);
      expect(result.mainPages).toHaveLength(3);
      // Thread has: threadReply only = 1 page
      expect(result.threadExports[0].pages).toHaveLength(1);
    });

    it('should skip threads with no messages', () => {
      const mainMsg = createMsg('1', 'ch1');

      const thread1: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Thread 1',
      } as Channel;

      const thread2: Channel = {
        id: 'thread2',
        type: 11,
        name: 'Thread 2',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [mainMsg],
        threads: [thread1, thread2],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // No threads should be exported since they have no messages
      expect(result.threadExports).toHaveLength(0);
      expect(result.mainPages[0].messages).toHaveLength(1);
    });

    it('should use correct entity name for thread files', () => {
      const threadStarter = createMsg('0', 'ch1');
      threadStarter.thread = { id: 'thread1', name: 'Thread 1' };
      const threadReply = createMsg('1', 'thread1');

      const thread: Channel = {
        id: 'thread1',
        type: 11,
        name: 'Test/Thread:Name',
      } as Channel;

      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [threadStarter, threadReply],
        threads: [thread],
        separateThreads: true,
      };

      const result = prepareExportData(config);

      // Thread entity name should be sanitized
      expect(result.threadExports[0].pages[0].filePath).toContain('exports/test-guild');
      expect(result.threadExports[0].pages[0].filePath).not.toContain('/Thread');
      expect(result.threadExports[0].pages[0].filePath).not.toContain(':Name');
    });
  });

  describe('Format Handling', () => {
    it('should generate CSV file path', () => {
      const messages = [createMsg('1', 'ch1')];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        format: 'csv',
      };

      const result = prepareExportData(config);

      expect(result.mainPages[0].filePath).toContain('.csv');
    });

    it('should generate JSON file path', () => {
      const messages = [createMsg('1', 'ch1')];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        format: 'json',
      };

      const result = prepareExportData(config);

      expect(result.mainPages[0].filePath).toContain('.json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages array', () => {
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages: [],
      };

      const result = prepareExportData(config);

      expect(result.mainPages).toHaveLength(0);
      expect(result.threadExports).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle single message', () => {
      const messages = [createMsg('1', 'ch1')];
      const config: ExportPaginationConfig = {
        ...baseConfig,
        messages,
        messagesPerPage: 100,
      };

      const result = prepareExportData(config);

      expect(result.mainPages).toHaveLength(1);
      expect(result.mainPages[0].messages).toHaveLength(1);
    });
  });
});
