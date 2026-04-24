import type { Channel } from "./channel";
import type { ThreadMetaData } from "./thread-metadata";

export type ThreadModify = Partial<
  Pick<Channel, "name" | "rate_limit_per_user" | "flags" | "applied_tags"> &
    Pick<
      ThreadMetaData,
      "archived" | "auto_archive_duration" | "locked" | "invitable"
    >
>;