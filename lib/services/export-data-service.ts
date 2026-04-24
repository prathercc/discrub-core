import { Message, Channel } from "../types/discord-types.ts";
import { filterThreadsByMessages, getOsSafeString, getThreadEntityName } from "../utils/discrub-utils.ts";

export interface ExportPage {
  messages: Message[];
  pageNumber: number;
  filePath: string;
}

export interface ThreadExportData {
  thread: Channel;
  threadNumber: number;
  totalThreads: number;
  pages: ExportPage[];
}

export interface ExportPaginationConfig {
  messages: Message[];
  messagesPerPage: number;
  entityName: string;
  entityMainDirectory: string;
  format: string;
  threads: Channel[];
  separateThreads: boolean;
}

export interface ExportDataResult {
  mainPages: ExportPage[];
  threadExports: ThreadExportData[];
  totalPages: number;
}

/**
 * Sanitizes entity name for use in file paths
 * @param name Entity name to sanitize
 * @returns Sanitized name
 */
const sanitizeEntityName = (name: string): string => {
  return getOsSafeString(name);
};

/**
 * Creates paginated pages from messages
 * @param messages Messages to paginate
 * @param messagesPerPage Number of messages per page
 * @param entityName Name of the entity being exported
 * @param entityMainDirectory Main directory for export
 * @param format Export format (html, json, csv)
 * @returns Array of export pages
 */
const createPages = (
  messages: Message[],
  messagesPerPage: number,
  entityName: string,
  entityMainDirectory: string,
  format: string,
): ExportPage[] => {
  if (messages.length === 0) {
    return [];
  }

  const totalPages =
    messages.length > messagesPerPage
      ? Math.ceil(messages.length / messagesPerPage)
      : 1;

  const pages: ExportPage[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const startIndex = pageNumber === 1 ? 0 : (pageNumber - 1) * messagesPerPage;
    const pageMessages = messages.slice(startIndex, startIndex + messagesPerPage);
    const filePath = `${entityMainDirectory}/${sanitizeEntityName(entityName)}_page_${pageNumber}.${format}`;

    pages.push({
      messages: pageMessages,
      pageNumber,
      filePath,
    });
  }

  return pages;
};

/**
 * Organizes messages into pages and separates threads if configured
 * @param config Export pagination configuration
 * @returns Structured export data with pages and thread information
 */
export const prepareExportData = (config: ExportPaginationConfig): ExportDataResult => {
  const {
    messages,
    messagesPerPage,
    entityName,
    entityMainDirectory,
    format,
    threads: allThreads,
    separateThreads,
  } = config;

  const threads = filterThreadsByMessages(allThreads, messages);
  const threadExports: ThreadExportData[] = [];
  let mainMessages = messages;

  // Separate thread messages if configured
  if (separateThreads) {
    // Keep thread starters (m.thread) in main — they show the thread banner link.
    // Only filter out replies whose channel_id matches a thread.
    mainMessages = messages.filter(
      (m) => !threads.some((t) => t.id === m.channel_id),
    );

    // Process each thread — include only replies (channel_id matches thread).
    // The original starter (m.thread) stays in main with the thread banner link.
    // The type 21 system message inside the thread provides starter context.
    threads.forEach((thread, index) => {
      const threadMessages = messages.filter(
        (m) => m.channel_id === thread.id,
      );

      if (threadMessages.length > 0) {
        const threadEntityName = getThreadEntityName(thread);
        const threadPages = createPages(
          threadMessages,
          messagesPerPage,
          threadEntityName,
          entityMainDirectory,
          format,
        );

        threadExports.push({
          thread,
          threadNumber: index + 1,
          totalThreads: threads.length,
          pages: threadPages,
        });
      }
    });
  }

  // Create pages for main messages
  const mainPages = createPages(
    mainMessages,
    messagesPerPage,
    entityName,
    entityMainDirectory,
    format,
  );

  return {
    mainPages,
    threadExports,
    totalPages: mainPages.length,
  };
};
