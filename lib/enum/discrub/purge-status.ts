export enum PurgeStatus {
  // General statuses
  IN_PROGRESS = "In Progress",
  REMOVED = "Removed",
  MISSING_PERMISSION = "Missing Permission",
  MESSAGE_NON_REMOVABLE = "Non-Removable",

  // Attachment-specific statuses
  ATTACHMENTS_KEPT = "Attachments Kept",

  // Reaction-specific statuses
  REACTIONS_REMOVED = "Reactions Removed",
  REACTIONS_PARTIALLY_REMOVED = "Reactions Partially Removed",
  NO_REACTIONS_FOUND = "Reactions Not Found",
}