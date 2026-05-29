// Lib-side export-emitter types (#195 cluster B).
// Promoted from the discrub consumer's `src/features/export/exportTypes.ts`.
// These are the knobs that the lib-side emitters (textEmitter et al)
// need to know about. Consumer-state types (ExportSettingsSnapshot,
// BUILT_IN_PRESETS, ExportState, etc.) stay on the consumer side.

/**
 * URL → local-path maps for downloaded media. Lib-side emitters
 * consult these to rewrite remote URLs to local archive paths so
 * exported HTML stays usable offline.
 */
export interface MediaMaps {
  avatarMap: Record<string, string>;
  mediaMap: Record<string, string>;
  emojiMap: Record<string, string>;
  roleMap: Record<string, string>;
}

/**
 * Per-export configuration that lib-side emitters consume. Stays
 * orthogonal to the consumer's full `ExportSettingsSnapshot`, which
 * also includes preset/format/page-size knobs not relevant to a
 * single emitter invocation.
 */
export interface ExportConfig {
  artistMode: boolean;
  sortOrder: "ascending" | "descending";
  previewMedia: boolean;
  dateFormat: string;
  timeFormat: string;
  exportTemplate?: "standard" | "discord";
}

// Plain-text emitter knobs (originally added in discrub-web #184).

export type TextAttachmentStyle = "inline" | "sidecar" | "skip";
export type TextReactionsStyle = "include" | "skip";
export type TextRepliesStyle = "quote" | "link" | "skip";
export type TextBotIndicatorStyle = "include" | "skip";

export interface TextFormatOptions {
  attachmentStyle: TextAttachmentStyle;
  reactions: TextReactionsStyle;
  replies: TextRepliesStyle;
  botIndicator: TextBotIndicatorStyle;
}

export const defaultTextFormatOptions: TextFormatOptions = {
  attachmentStyle: "inline",
  reactions: "include",
  replies: "quote",
  botIndicator: "include",
};
