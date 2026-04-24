// https://discord.com/developers/docs/resources/user#user-object
export type User = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null | undefined;
  avatar: string | null | undefined;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null | undefined;
  accent_color?: number | null | undefined;
  locale?: string;
  verified?: boolean;
  email?: string | null | undefined;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
  avatar_decoration?: string | null | undefined;
};