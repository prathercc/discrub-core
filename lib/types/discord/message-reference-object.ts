// https://discord.com/developers/docs/resources/channel#message-reference-object
export type MessageReferenceObject = {
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
  fail_if_not_exists?: boolean;
};