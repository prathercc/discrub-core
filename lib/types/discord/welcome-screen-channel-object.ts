// https://discord.com/developers/docs/resources/guild#welcome-screen-object-welcome-screen-channel-structure
export type WelcomeScreenChannelObject = {
  channel_id: string;
  description: string;
  emoji_id: string | null | undefined;
  emoji_name: string | null | undefined;
};