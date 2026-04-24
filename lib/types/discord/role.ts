// https://discord.com/developers/docs/topics/permissions#role-object
import type { RoleTags } from "./role-tags";

export type Role = {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null | undefined;
  unicode_emoji?: string | null | undefined;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: RoleTags;
  flags: number;
};