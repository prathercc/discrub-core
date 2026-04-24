// https://discord.com/developers/docs/resources/channel#allowed-mentions-object
export type AllowedMentionObject = {
  parse: string[];
  roles: string[];
  users: string[];
  replied_user: boolean;
};