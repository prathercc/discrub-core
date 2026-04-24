// https://discord.com/developers/docs/resources/guild#welcome-screen-object
import type { WelcomeScreenChannelObject } from "./welcome-screen-channel-object";

export type WelcomeScreenObject = {
  description: string | null | undefined;
  welcome_channels: WelcomeScreenChannelObject[];
};