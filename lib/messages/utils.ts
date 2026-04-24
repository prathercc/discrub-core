import { parseISO } from "date-fns";
import type { Message, Channel, User, GuildMemberObject } from "../types/discord-types.ts";
import type { SearchCriteria } from "../types/discrub-types.ts";
import { MessageType, IsPinnedType } from "../enum/discord-enum.ts";
import { messageTypeEquals } from "../utils/discrub-utils.ts";

// Constants
export const OFFSET_INCREMENT = 25;
export const MAX_OFFSET = 5000;
export const START_OFFSET = 0;

/**
 * Calculate the next search offset and criteria for paginated search
 */
export function getNextSearchData(
  message: Message,
  offset: number,
  totalMessages: number,
  isEndConditionMet: boolean,
  searchCriteria: SearchCriteria,
  endOffset?: number,
): {
  offset: number;
  isEndConditionMet: boolean;
  searchCriteria: SearchCriteria;
} {
  const nextOffset = offset + OFFSET_INCREMENT;

  // Check completion conditions
  const reachedEndOffset = !!endOffset && isSearchComplete(nextOffset, endOffset);
  const reachedAllResults = isSearchComplete(nextOffset, totalMessages);
  const shouldStop = isEndConditionMet || reachedEndOffset || reachedAllResults;

  // Handle max offset - need to reset with new before date
  if (offset === MAX_OFFSET) {
    return {
      offset: START_OFFSET,
      isEndConditionMet: shouldStop,
      searchCriteria: {
        ...searchCriteria,
        searchBeforeDate: parseISO(message.timestamp),
      },
    };
  }

  // Continue with next offset or reset if all results found
  return {
    offset: reachedAllResults ? START_OFFSET : nextOffset,
    isEndConditionMet: shouldStop,
    searchCriteria,
  };
}

/**
 * Generate status message for search progress
 */
export function getNextSearchStatus(
  threads: Channel[],
  messages: Message[],
  totalMessages: number,
  channel?: Channel,
): string {
  if (isGuildForum(channel)) {
    return `Retrieved ${threads.length} threads`;
  } else {
    return `Retrieved ${messages.length} of ${totalMessages} search results`;
  }
}

/**
 * Check if message type is allowed
 */
export function isMessageTypeAllowed(type: number): boolean {
  const allowedTypes = [
    MessageType.DEFAULT,
    MessageType.CHANNEL_PINNED_MESSAGE,
    MessageType.USER_JOIN,
    MessageType.GUILD_BOOST,
    MessageType.GUILD_BOOST_TIER_1,
    MessageType.GUILD_BOOST_TIER_2,
    MessageType.GUILD_BOOST_TIER_3,
    MessageType.CHANNEL_FOLLOW_ADD,
    MessageType.THREAD_CREATED,
    MessageType.REPLY,
    MessageType.CHAT_INPUT_COMMAND,
    MessageType.GUILD_INVITE_REMINDER,
    MessageType.CONTEXT_MENU_COMMAND,
    MessageType.AUTO_MODERATION_ACTION,
    MessageType.CALL,
  ];

  return allowedTypes.some((t) => messageTypeEquals(type, t));
}

/**
 * Check if search is complete
 */
export function isSearchComplete(offset: number, total: number): boolean {
  return offset >= total;
}

/**
 * Check if channel is a guild forum
 */
export function isGuildForum(channel?: Channel): boolean {
  return channel?.type === 15; // GUILD_FORUM
}

/**
 * Check if channel is a DM
 */
export function isDm(channel: Channel): boolean {
  return channel.type === 1 || channel.type === 3; // DM or GROUP_DM
}

/**
 * Check if search criteria is active
 */
export function isCriteriaActive(criteria: SearchCriteria): boolean {
  return !!(
    criteria.searchMessageContent ||
    (criteria.userIds && criteria.userIds.length > 0) ||
    (criteria.mentionIds && criteria.mentionIds.length > 0) ||
    (criteria.channelIds && criteria.channelIds.length > 0) ||
    (criteria.selectedHasTypes && criteria.selectedHasTypes.length > 0) ||
    criteria.searchBeforeDate ||
    criteria.searchAfterDate ||
    (criteria.isPinned && criteria.isPinned !== IsPinnedType.UNSET)
  );
}

/**
 * Encode emoji for Discord API
 */
export function getEncodedEmoji(emoji: {
  id?: string | null;
  name?: string | null;
}): string | null {
  if (!emoji.name) return null;
  return emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
}

/**
 * Extract user mapping data from User object
 */
export function getUserMappingData(user: User): {
  userName: string;
  displayName: string | null;
  avatar: string | null;
  timestamp: number;
} {
  return {
    userName: user.username,
    displayName: user.global_name || null,
    avatar: user.avatar || null,
    timestamp: Date.now(),
  };
}

/**
 * Extract guild member mapping data
 */
export function getGMOMappingData(member: GuildMemberObject): {
  roles: string[];
  nick: string | null | undefined;
  joinedAt: string | null | undefined;
  timestamp: number;
} {
  return {
    roles: member.roles || [],
    nick: member.nick,
    joinedAt: member.joined_at,
    timestamp: Date.now(),
  };
}

/**
 * Get thread entity name for display
 */
export function getThreadEntityName(thread: Channel): string {
  return thread.name || thread.id;
}

/**
 * Extract threads from messages
 */
export function getThreadsFromMessages(
  messages: Message[],
  knownThreads: Channel[],
): Channel[] {
  const threads: Channel[] = [];
  messages.forEach((msg) => {
    if (msg.thread && !knownThreads.some((t) => t.id === msg.thread!.id)) {
      threads.push(msg.thread);
    }
  });
  return threads;
}

/**
 * Extract mentioned user IDs from message content
 */
export function extractMentionedUserIds(content: string): string[] {
  const userMentionRegex = /<@!?(?<user_id>\d+)>/g;
  const mentions: string[] = [];
  let match;

  while ((match = userMentionRegex.exec(content)) !== null) {
    const userId = match.groups?.user_id;
    if (userId) mentions.push(userId);
  }

  return mentions;
}

/**
 * Check if user data is stale based on refresh rate
 */
export function isUserDataStale(
  timestamp: number | undefined,
  refreshRate: number,
): boolean {
  if (!timestamp) return true;
  const now = Date.now();
  const ageInHours = (now - timestamp) / (1000 * 60 * 60);
  return ageInHours > refreshRate;
}

/**
 * Default guild member mapping data
 */
export const defaultGMOMappingData = {
  roles: [],
  nick: null,
  joinedAt: null,
  timestamp: Date.now(),
};