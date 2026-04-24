import { MessageRegex } from "../regex/index.ts";
import {
  SpecialFormatting,
  SpecialFormattingContext,
} from "../types/message-formatting-types.ts";

/**
 * Parses Discord special formatting from message content
 * @param content String content to parse Discord special formatting
 * @param context Context object containing userMap and guildRoles
 * @returns An Object of special formatting
 */
export const parseSpecialFormatting = (
  content: string,
  context: SpecialFormattingContext,
): SpecialFormatting => {
  const { userMap, guildRoles } = context;

  return {
    userMention: Array.from(content.matchAll(MessageRegex.USER_MENTION))?.map(
      ({ 0: userMentionRef, groups: userMentionGroups }) => {
        const userId = userMentionGroups?.user_id || "";
        const foundRole = guildRoles.find((role) => role.id === userId);
        const { userName, displayName } = userMap[userId] || {};

        return {
          raw: userMentionRef,
          userName: foundRole?.name || displayName || userName || "Not Found",
          id: userId,
        };
      },
    ),
    channel: Array.from(content.matchAll(MessageRegex.CHANNEL_MENTION))?.map(
      ({ 0: channelRef, groups: channelGroups }) => {
        return { channelId: channelGroups?.channel_id, raw: channelRef };
      },
    ),
    underLine: Array.from(content.matchAll(MessageRegex.UNDER_LINE))?.map(
      ({ 0: underLineRef, groups: underLineGroups }) => {
        return {
          text: underLineGroups?.text?.replaceAll("__", "") || "",
          raw: underLineRef,
        };
      },
    ),
    code: Array.from(content.matchAll(MessageRegex.CODE))?.map(
      ({ 0: codeRef, groups: codeGroups }) => {
        return {
          text: codeGroups?.text?.replaceAll("```", "") || "",
          raw: codeRef,
        };
      },
    ),
    italics: Array.from(content.matchAll(MessageRegex.ITALICS))?.map(
      ({ 0: italicRef, groups: italicGroups }) => {
        return {
          text: italicGroups?.text?.replaceAll("_", "") || "",
          raw: italicRef,
        };
      },
    ),
    bold: Array.from(content.matchAll(MessageRegex.BOLD))?.map(
      ({ 0: boldRef, groups: boldGroups }) => {
        return {
          text: boldGroups?.text?.replaceAll("**", "") || "",
          raw: boldRef,
        };
      },
    ),
    link: Array.from(content.matchAll(MessageRegex.LINK))?.map(
      ({ 0: linkRef, groups: linkGroups }) => {
        const rawUrl = linkGroups?.url || null;
        const rawText = linkGroups?.name || null;
        const rawDescription = linkGroups?.description?.trim() || null;
        return {
          url: rawUrl ? rawUrl.slice(1) : "",
          text: rawText ? rawText?.slice(1, rawText.length - 1) : "",
          description: rawDescription
            ? rawDescription?.slice(1, rawDescription.length - 2)
            : "",
          raw: `${linkRef}${rawDescription ? "" : ")"}`,
        };
      },
    ),
    quote:
      content.match(MessageRegex.QUOTE)?.map((quoteRef) => ({
        text: quoteRef?.split("`")[1],
        raw: quoteRef,
      })) || [],
    hyperLink:
      content.match(MessageRegex.HYPER_LINK)?.map((hyperLinkRef) => ({
        raw: hyperLinkRef?.trim(),
      })) || [],
    emoji:
      content.match(MessageRegex.EMOJI)?.map((emojiRef) => ({
        raw: emojiRef,
        name: `:${emojiRef.split(":")[1]}:`,
        id: emojiRef.split(":")[2].replace(">", ""),
      })) || [],
  };
};
