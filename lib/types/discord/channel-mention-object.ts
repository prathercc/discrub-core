// https://discord.com/developers/docs/resources/channel#channel-mention-object
export type ChannelMentionObject = {
  id: string;
  guild_id: string;
  type: number;
  name: string;
};