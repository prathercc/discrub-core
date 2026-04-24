// https://discord.com/developers/docs/resources/channel#overwrite-object
export type OverwriteObject = {
  id: string;
  type: number;
  allow: string;
  deny: string;
};