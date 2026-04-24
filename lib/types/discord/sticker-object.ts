// https://discord.com/developers/docs/resources/sticker#sticker-object
import type { User } from "./user";

export type StickerObject = {
  id: string;
  pack_id?: string;
  name: string;
  description: string | null | undefined;
  tags: string;
  asset?: string;
  type: number;
  format_type: number;
  available?: boolean;
  guild_id?: string;
  user?: User;
  sort_value?: number;
};