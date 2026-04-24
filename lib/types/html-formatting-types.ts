import type { ExportEmojiMap } from './discrub-types';

/**
 * Context object for HTML formatting operations
 * Contains all necessary maps and data for converting Discord content to HTML
 */
export interface HtmlFormattingContext {
  /** Map of user IDs to user display information */
  userMap: Record<string, { userName?: string; displayName?: string }>;
  /** Optional map of channel IDs to channel names */
  channelMap?: Record<string, { name: string }>;
  /** Optional array of guild roles for mention formatting */
  guildRoles?: Array<{ id: string; name: string }>;
  /** Optional map of emoji IDs to local file paths */
  emojiMap?: ExportEmojiMap;
  /** Optional sanitized name for file path generation */
  sanitizedName?: string;
  /**
   * Guild display name. Used by the system-message renderer for boost-tier
   * (types 9-11) and incident (types 38-39) templates that reference the
   * server by name. Omit for DM exports or when rendering out of guild
   * context — the renderer falls back to "the server" in that case.
   */
  guildName?: string;
}

/**
 * Options for rendering embeds as HTML
 */
export interface EmbedRenderOptions {
  /** Whether to include image elements in the rendered embed */
  includeImages?: boolean;
  /** Whether to include video elements in the rendered embed */
  includeVideos?: boolean;
  /**
   * Optional URL→local-path map for embed media (image, video, thumbnail).
   * When provided, the renderer swaps the remote URL for the local path so
   * exported archives stay offline-usable after the source CDN takes media
   * down. Falls back to the remote URL when a lookup misses.
   */
  mediaMap?: Record<string, string>;
}