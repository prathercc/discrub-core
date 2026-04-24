// https://discord.com/developers/docs/resources/channel#forum-tag-object
export type ForumTagObject = {
  id: string;
  name: string;
  moderated: boolean;
  emoji_id: string | null | undefined;
  emoji_name: string | null | undefined;
};