// https://discord.com/developers/docs/resources/guild#guild-member-object
import type { User } from "./user";

export type GuildMemberObject = {
  user?: User;
  nick?: string | null | undefined;
  avatar?: string | null | undefined;
  roles: string[];
  joined_at: string;
  premium_since?: string | null | undefined;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string | null | undefined;
};