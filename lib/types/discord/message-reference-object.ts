// https://discord.com/developers/docs/resources/channel#message-reference-object
//
// `type` discriminator (added late 2024 with the Forward Message feature):
//   0 = DEFAULT (REPLY / crosspost reference — the historical shape)
//   1 = FORWARD (the message_snapshots array carries the forwarded payload)
// Discord clients written before late 2024 didn't read this field and
// treated every `message_reference` as a reply pointer; for backward
// compat the field is optional. Filed under #197.
export type MessageReferenceObject = {
  type?: number;
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
  fail_if_not_exists?: boolean;
};