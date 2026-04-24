// https://discord.com/developers/docs/interactions/receiving-and-responding#message-interaction-object-message-interaction-structure
import type { GuildMemberObject } from "./guild-member-object";
import type { User } from "./user";

export type MessageInteractionObject = {
  id: string;
  type: string;
  name: string;
  user: User;
  member?: GuildMemberObject;
};