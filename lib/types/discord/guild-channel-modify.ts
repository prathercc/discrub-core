import type { Channel } from "./channel";

export type GuildChannelModify = Partial<
  Pick<
    Channel,
    | "name"
    | "type"
    | "position"
    | "topic"
    | "nsfw"
    | "rate_limit_per_user"
    | "bitrate"
    | "user_limit"
    | "permission_overwrites"
    | "parent_id"
    | "rtc_region"
    | "video_quality_mode"
    | "default_auto_archive_duration"
    | "flags"
    | "available_tags"
    | "default_reaction_emoji"
    | "default_thread_rate_limit_per_user"
    | "default_sort_order"
    | "default_forum_layout"
  >
>;