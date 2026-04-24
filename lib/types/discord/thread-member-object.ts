// https://discord.com/developers/docs/resources/channel#thread-member-object
import type { GuildMemberObject } from "./guild-member-object";

export type ThreadMemberObject = {
  id?: string;
  user_id?: string;
  join_timestamp: string;
  flags: number;
  member?: GuildMemberObject;
};