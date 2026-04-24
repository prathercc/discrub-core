// https://discord.com/developers/docs/resources/emoji#emoji-object
import type { User } from "./user";

export type Emoji = {
  id: string | null | undefined;
  name: string | null | undefined;
  roles?: string[];
  user?: User;
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
  available?: boolean;
};