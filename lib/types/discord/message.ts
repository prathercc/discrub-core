// https://discord.com/developers/docs/resources/channel#message-object
import type { ApplicationObject } from "./application-object";
import type { Attachment } from "./attachment";
import type { Channel } from "./channel";
import type { ChannelMentionObject } from "./channel-mention-object";
import type { ComponentObject } from "./component-object";
import type { Embed } from "./embed";
import type { MessageActivityObject } from "./message-activity-object";
import type { MessageCallObject } from "./message-call-object";
import type { MessageInteractionObject } from "./message-interaction-object";
import type { MessageReferenceObject } from "./message-reference-object";
import type { PollObject } from "./poll-object";
import type { Reaction } from "./reaction";
import type { ResolvedDataObject } from "./resolved-data-object";
import type { RoleSubscriptionDataObject } from "./role-subscription-data-object";
import type { StickerItemObject } from "./sticker-item-object";
import type { StickerObject } from "./sticker-object";
import type { User } from "./user";

export type Message = {
  id: string;
  channel_id: string;
  call?: MessageCallObject;
  author: User;
  content: string;
  timestamp: string;
  edited_timestamp: string | null | undefined;
  tts: boolean;
  mention_everyone: boolean;
  mentions: User[];
  mention_channels?: ChannelMentionObject[];
  attachments: Attachment[];
  embeds: Embed[];
  reactions?: Reaction[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: number;
  activity?: MessageActivityObject;
  application?: ApplicationObject;
  application_id?: string;
  message_reference?: MessageReferenceObject;
  flags?: number;
  referenced_message?: Message | null | undefined;
  /**
   * Forward Message snapshots (Discord late-2024 feature). When a user
   * forwards a message into a channel, the receiving message has
   * `message_reference.type === 1` and this array populated with the
   * partial Message payload of the original (content, attachments,
   * embeds, mentions, timestamp, etc.). The snapshot intentionally omits
   * `author` for privacy. Filed under #197.
   */
  message_snapshots?: MessageSnapshot[];
  interaction?: MessageInteractionObject;
  thread?: Channel;
  components?: ComponentObject[];
  sticker_items?: StickerItemObject[];
  stickers?: StickerObject[];
  poll?: PollObject;
  position?: number;
  role_subscription_data?: RoleSubscriptionDataObject;
  resolved?: ResolvedDataObject;
  userName?: string; // Used for quick filtering purposes
};

/**
 * A single forward-snapshot's payload. Discord strips `author` (privacy)
 * and sends a partial Message shape with the content/attachments/
 * embeds/timestamp the user actually forwarded. Filed under #197.
 */
export type MessageSnapshot = {
  message?: Partial<Message>;
};
