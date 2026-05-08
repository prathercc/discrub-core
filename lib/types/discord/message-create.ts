import type { AllowedMentionObject } from "./allowed-mention-object";
import type { MessageReferenceObject } from "./message-reference-object";

/**
 * Body shape for `POST /channels/{channelId}/messages`.
 *
 * Mirrors the subset of Discord's create-message API that consumers
 * reach for in practice: content, optional reply reference, optional
 * embeds, allowed_mentions for ping control. Additional fields
 * (sticker_ids, components, attachments, files for multipart) live
 * on the Discord docs but aren't surfaced here until a consumer
 * needs them — kept minimal to limit the public-API churn.
 *
 * https://discord.com/developers/docs/resources/channel#create-message
 */
export type MessageCreate = {
  content?: string;
  message_reference?: MessageReferenceObject;
  allowed_mentions?: AllowedMentionObject;
  tts?: boolean;
  flags?: number;
};
