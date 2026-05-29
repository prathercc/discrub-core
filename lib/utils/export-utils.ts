import { parseSpecialFormatting } from "./message-formatting-utils.ts";
import type { ExportEmojiMap } from "../types/discrub-types.ts";

/**
 * Replaces user mention tags in content with @ mentions using usernames
 * @param content The message content containing user mention tags
 * @param userMap Map of user IDs to user data
 * @param guildRoles Array of guild roles
 * @returns Content with user mentions replaced by @username format
 */
export const replaceUserMentionsWithUsernames = (
  content: string,
  userMap: Record<string, { userName?: string | null }>,
  guildRoles: Array<{ id: string; name: string }>,
): string => {
  let modifiedContent = content;
  const { userMention } = parseSpecialFormatting(content, {
    userMap,
    guildRoles,
  });

  if (userMention.length) {
    userMention.forEach((userMentionRef) => {
      const { userName } = userMap[userMentionRef.id] || {};
      modifiedContent = modifiedContent.replaceAll(
        userMentionRef.raw,
        `@${userName || "Unknown"}`,
      );
    });
  }

  return modifiedContent;
};

/**
 * Converts Discord emoji syntax to HTML img tags
 * @param content Message content with emoji syntax like <:name:123> or <a:name:123>
 * @param emojiMap Map of emojiId -> local file path
 * @param sanitizedName Entity name for path resolution
 * @returns HTML string with img tags replacing emoji syntax
 */
export const convertEmojisToHtml = (
  content: string,
  emojiMap?: ExportEmojiMap | null,
  sanitizedName?: string,
): string => {
  const emojiRegex = /<(a)?:(\w+):(\d+)>/g;

  return content.replace(emojiRegex, (_match, animated, name, id) => {
    let imgSrc: string;
    const localPath = emojiMap?.[id];

    if (localPath && sanitizedName) {
      // Convert to relative path: "channel_name/emojis/123.webp" -> "emojis/123.webp"
      imgSrc = localPath.replace(`${sanitizedName}/`, "");
    } else {
      // Fallback to CDN with animated parameter
      const animatedParam = animated ? "?animated=true" : "";
      imgSrc = `https://cdn.discordapp.com/emojis/${id}.webp${animatedParam}`;
    }

    return `<img class="emoji" src="${imgSrc}" alt=":${name}:" title=":${name}:">`;
  });
};

/**
 * Renders a single emoji as HTML img tag (for reactions)
 * @param emoji Emoji object from Discord API
 * @param emojiMap Map of emojiId -> local file path
 * @param sanitizedName Entity name for path resolution
 * @returns HTML img tag or fallback text
 */
export const renderEmojiAsHtml = (
  emoji: { id?: string | null; name?: string | null; animated?: boolean | null },
  emojiMap?: ExportEmojiMap | null,
  sanitizedName?: string,
): string => {
  const { id, name, animated } = emoji;

  // Standard unicode emoji (no custom ID)
  if (!id) {
    return name || "?";
  }

  // Custom emoji
  let imgSrc: string;
  const localPath = emojiMap?.[id];

  if (localPath && sanitizedName) {
    imgSrc = localPath.replace(`${sanitizedName}/`, "");
  } else {
    const animatedParam = animated ? "?animated=true" : "";
    imgSrc = `https://cdn.discordapp.com/emojis/${id}.webp${animatedParam}`;
  }

  return `<img class="emoji-reaction" src="${imgSrc}" alt=":${name}:" title=":${name}:">`;
};

// #195 cluster B: re-export the plain-text emitter so consumers can
// `import { buildTextMessageBlock } from 'discrub-core/export-utils'`
// alongside the other export helpers, without needing a separate
// `./text-emitter` package entry.
export {
  buildTextMessageBlock,
  generateTextPage,
  type GenerateTextPageOptions,
} from "./text-emitter.ts";
