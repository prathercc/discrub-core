import type { ExportReaction } from "./export-reaction";

/**
 * This is a 'Message Id & emoji -> Export Reaction List' map.
 */
export type ExportReactionMap = {
  [id: string]: {
    [emoji: string]: ExportReaction[];
  };
};