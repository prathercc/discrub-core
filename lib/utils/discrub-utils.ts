import filenamify from "filenamify";
import { nanoid } from "nanoid";
import {
  ExportAvatarMap,
  ExportEmojiMap,
  ExportReaction,
  ExportRoleMap,
  ExportUserMap,
  ResolvedFilePathObject,
  SearchCriteria,
} from "../types/discrub-types.ts";
import {
  addDays,
  addSeconds,
  format,
  isAfter,
  parseISO,
  toDate,
} from "date-fns";
import { START_OFFSET } from "../constants/discord/search.ts";
import {
  Attachment,
  Channel,
  Embed,
  Emoji,
  Guild,
  GuildMemberObject,
  Message,
  Role,
  User,
} from "../types/discord-types.ts";
import {
  ChannelType,
  EmbedType,
  IsPinnedType,
  MessageType,
} from "../enum/discord-enum.ts";
import { isAttachment, isGuild, isRole } from "../guards/discrub-guards.ts";
import { isNonNullable } from "../guards/common-guards.ts";
import { Tag, UserDataRefreshRate } from "../enum/discrub-enum.ts";
import { SortDirection } from "../enum/common-enum.ts";

/**
 *
 * @param a Compare from
 * @param b Compare to
 * @param property Object property
 * @param direction Possible directions: 'desc' or 'asc'. (Default = 'asc')
 */
export const sortByProperty = <T>(
  a: T,
  b: T,
  property: string,
  direction: SortDirection = SortDirection.ASCENDING,
) => {
  const aVal = a[property as keyof T];
  const bVal = b[property as keyof T];
  return aVal < bVal
    ? direction === SortDirection.ASCENDING
      ? -1
      : 1
    : aVal > bVal
      ? direction === SortDirection.ASCENDING
        ? 1
        : -1
      : 0;
};

/**
 * Sort an array of objects by a property
 * Returns a new sorted array (immutable)
 *
 * @param items - Array to sort
 * @param orderBy - Property key to sort by
 * @param direction - ASCENDING or DESCENDING (defaults to ASCENDING)
 * @returns New sorted array
 *
 * @example
 * const sortedMessages = sortBy(messages, "timestamp", SortDirection.ASCENDING);
 * const sortedChannels = sortBy(channels, "name", SortDirection.DESCENDING);
 */
export const sortBy = <T>(
  items: T[],
  orderBy: keyof T,
  direction: SortDirection = SortDirection.ASCENDING,
): T[] => {
  return [...items].sort((a, b) =>
    sortByProperty(a, b, orderBy as string, direction),
  );
};

/**
 *
 * @param index The index to check the percentage of
 * @param total The total number that to check the percentage from
 * @returns Percent value from `index` of `total`
 */
export const getPercent = (index: number, total: number): string => {
  if (index === 0 && total === 0) return "0";
  return ((index / total) * 100).toString().split(".")[0];
};

/**
 *
 * @param arr
 * @returns The joined strings properly punctuated
 */
export const punctuateStringArr = (arr: String[]) => {
  let str = "";
  arr.forEach((s) => {
    str = `${str}${
      str.length ? `${arr[arr.length - 1] === s ? " and " : ", "}` : ""
    }${s}`;
  });
  return str;
};

/**
 *
 * @param color Integer representation of hexadecimal color code
 * @returns Hexadecimal color code
 */
export const colorToHex = (color: number | null | undefined): string => {
  if (!color) {
    return "#FFF";
  }

  return `#${color.toString(16)}`;
};

/**
 *
 * @param str The value to strip unsafe characters from
 * @returns OS safe version of `str`
 */
export const getOsSafeString = (str: string) => {
  return filenamify(str);
};

interface FormatUserData {
  userId?: string | null;
  userName?: string | null;
  displayName?: string | null;
  guildNickname?: string | null;
  joinedAt?: string | null;
  roleNames?: string[];
}

/**
 *
 * @param userId
 * @param userName
 * @param displayName
 * @param guildNickName
 * @param joinedAt
 * @param roleNames Array of Role names as Strings
 * @returns String formatted User data, to be used as HTML element title prop value
 */
export const formatUserData = ({
  userId,
  userName,
  displayName,
  guildNickname,
  joinedAt,
  roleNames = [],
}: FormatUserData) => {
  return `${userName ? `Username: ${userName}\n` : ""}${
    displayName ? `Display Name: ${displayName}\n` : ""
  }${guildNickname ? `Server Nickname: ${guildNickname}\n` : ""}${
    userId ? `User ID: ${userId}` : ""
  }${joinedAt ? `\nJoined Server: ${joinedAt}` : ""}${
    roleNames.length ? `\n\nRoles: ${roleNames.join(", ")}` : ""
  }`;
};

export const getRichEmbeds = (message: Message): Embed[] => {
  return message.embeds.filter((embed) => embed.type === EmbedType.RICH);
};

export const getExportFileName = (
  entity: Role | Attachment | Embed,
  type: string,
) => {
  if (isRole(entity)) {
    return `${getOsSafeString(entity.name)}_${entity.id}.${type}`;
  } else if (isAttachment(entity)) {
    return `${getOsSafeString(entity.filename)}.${getFsUUID()}.${type}`;
  } else {
    const name = entity.title ? `${entity.title}_` : "";
    return `${getOsSafeString(name)}.${getFsUUID()}.${type}`;
  }
};

export const getColor = (value: number): string => {
  return colorToHex(value);
};

export const getIconUrl = (entity: Channel | Guild) => {
  if (isGuild(entity)) {
    if (!entity.icon) {
      return "resources/media/default_group_chat_icon.png";
    }
    return `https://cdn.discordapp.com/icons/${entity.id}/${entity.icon}`;
  } else {
    if (entity.type === ChannelType.GROUP_DM) {
      return "resources/media/default_group_chat_icon.png";
    }

    if (entity.type === ChannelType.DM && entity.recipients?.[0]?.avatar) {
      return resolveAvatarUrl(
        entity.recipients[0].id,
        entity.recipients[0].avatar,
      ).remote;
    }

    if (entity.type === ChannelType.GUILD_TEXT) {
      return entity.nsfw
        ? "resources/media/GUILD_TEXT_NSFW.svg"
        : "resources/media/GUILD_TEXT.svg";
    }
    if (entity.type === ChannelType.GUILD_VOICE) {
      return "resources/media/GUILD_VOICE.svg";
    }
    const isThread = [
      ChannelType.PUBLIC_THREAD,
      ChannelType.PRIVATE_THREAD,
    ].some((t) => t === entity.type);
    if (entity.type === ChannelType.GUILD_FORUM || isThread) {
      return "resources/media/GUILD_FORUM.svg";
    }
    if (entity.type === ChannelType.GUILD_ANNOUNCEMENT) {
      return "resources/media/GUILD_ANNOUNCEMENT.svg";
    }

    return "resources/media/default_dm_icon.png";
  }
};

export const getEntityHint = (entity: string) =>
  `Hint: Manually load a ${entity} by pasting an ID here, then press the Return key 🙂.`;

export const entityIsImage = (entity: Attachment | Embed) => {
  if (isAttachment(entity)) {
    return Boolean(
      entity.content_type?.includes("image") ||
        ["png", "jpg", "jpeg", "gif"].some((sit) =>
          entity.filename.includes(sit),
        ),
    );
  } else {
    return [EmbedType.IMAGE, EmbedType.RICH, EmbedType.ARTICLE].some(
      (type) => type === entity.type,
    );
  }
};

export const entityIsVideo = (entity: Attachment | Embed) => {
  if (isAttachment(entity)) {
    return Boolean(entity.content_type?.includes("video"));
  } else {
    return [EmbedType.GIFV, EmbedType.VIDEO].some(
      (type) => type === entity.type,
    );
  }
};

export const entityIsAudio = (entity: Attachment | Embed) => {
  if (isAttachment(entity)) {
    return Boolean(
      entity.content_type?.includes("audio") ||
        ["ogg"].some((sit) => entity.filename.includes(sit)),
    );
  }
  // TODO: Look into supporting embedded audio.
  return false;
};

export const entityContainsMedia = (entity: Attachment | Embed) => {
  return (
    entityIsImage(entity) || entityIsVideo(entity) || entityIsAudio(entity)
  );
};

export const getMediaUrls = (entity: Attachment | Embed): string[] => {
  let urls: (string | undefined)[] = [];

  if (isAttachment(entity)) {
    urls = [entity.proxy_url];
  } else {
    switch (entity.type) {
      case EmbedType.GIFV:
        urls = [entity.video?.proxy_url];
        break;
      case EmbedType.IMAGE:
        urls = [entity.thumbnail?.proxy_url];
        break;
      case EmbedType.RICH:
        urls = [
          entity.author?.proxy_icon_url,
          entity.image?.proxy_url,
          entity.thumbnail?.proxy_url,
          entity.footer?.proxy_icon_url,
        ];
        break;
      case EmbedType.ARTICLE:
        urls = [entity.thumbnail?.proxy_url];
        break;
      case EmbedType.VIDEO:
        urls = [entity.video?.proxy_url];
        break;
      default:
        break;
    }
  }
  return urls.filter(isNonNullable);
};

export const isDm = (channel: Channel) => {
  return [ChannelType.DM, ChannelType.GROUP_DM].some(
    (type) => type === channel.type,
  );
};

type HighestRole = {
  colorRole: Role | null | undefined;
  iconRole: Role | null | undefined;
};

/**
 *
 * @param {Array} roleIds Array of String roleIds
 * @returns An object containing Role entities for the highest position color and icon
 */
export const getHighestRoles = (
  roleIds: string[] = [],
  guild: Guild,
): HighestRole | null | undefined => {
  if (!guild.roles || !roleIds) {
    return null;
  }

  const applicableRoles = _getApplicableRoles(roleIds, guild);

  const colorRole =
    _orderRoles(applicableRoles.filter((role) => Boolean(role.color)))?.[0] ||
    null;

  const iconRole =
    _orderRoles(
      applicableRoles.filter(
        (role) => !!resolveRoleUrl(role.id, role.icon).remote,
      ),
    )?.[0] || null;

  return { colorRole, iconRole };
};

export const getRoleNames = (
  roleIds: string[] = [],
  guild: Guild,
): string[] => {
  const applicableRoles = _getApplicableRoles(roleIds, guild);

  return _orderRoles(applicableRoles).map((role) => role.name);
};

/**
 *
 * @param {Array} roles Array of Roles to be ordered
 * @returns An ordered array of Roles, descending by position
 */
const _orderRoles = (roles: Role[] = []): Role[] => {
  return roles
    .map((role) => ({ ...role }))
    .sort((a, b) => sortByProperty(a, b, "position", SortDirection.DESCENDING));
};

const _getApplicableRoles = (roleIds: string[] = [], guild: Guild): Role[] => {
  return (
    guild.roles?.filter(
      (role) => roleIds.some((id) => id === role.id) && Boolean(role.position),
    ) || []
  );
};

export const getEncodedEmoji = (emoji: Emoji): string | null => {
  const { name, id } = emoji;
  const emojiString = id ? `${name}:${id}` : name;
  return emojiString || null;
};

export const isGuildForum = (channel: Channel | null | undefined) => {
  return !!(
    channel &&
    [ChannelType.GUILD_FORUM, ChannelType.GUILD_MEDIA].some(
      (type) => type === channel.type,
    )
  );
};

export const resolveRoleUrl = (
  roleId: string,
  roleIcon: string | null | undefined,
  roleMap?: ExportRoleMap | null,
): ResolvedFilePathObject => {
  const remoteFilePath =
    roleId && roleIcon
      ? `https://cdn.discordapp.com/role-icons/${roleId}/${roleIcon}`
      : undefined;

  let localFilePath = remoteFilePath
    ? roleMap?.[remoteFilePath] || undefined
    : undefined;

  if (localFilePath) {
    localFilePath = `../${localFilePath}`;
  }

  return {
    remote: remoteFilePath,
    local: localFilePath,
  };
};

export const resolveEmojiUrl = (
  emojiId: string | null | undefined,
  emojiMap?: ExportEmojiMap | null,
): ResolvedFilePathObject => {
  let localFilePath = emojiId ? emojiMap?.[emojiId] || undefined : undefined;
  if (localFilePath) {
    localFilePath = `../${localFilePath}`;
  }

  return {
    remote: `https://cdn.discordapp.com/emojis/${emojiId}`,
    local: localFilePath,
  };
};

export const resolveAvatarUrl = (
  userId: string,
  avatar: string | null | undefined,
  avatarMap?: ExportAvatarMap,
): ResolvedFilePathObject => {
  const idAndAvatar = `${userId}/${avatar}`;
  let localFilePath = avatarMap?.[idAndAvatar] || undefined;
  if (localFilePath) {
    localFilePath = `../${localFilePath}`;
  }

  return {
    remote: avatar
      ? `https://cdn.discordapp.com/avatars/${idAndAvatar}`
      : "resources/media/default_avatar.png",
    local: localFilePath,
  };
};

export const stringToBool = (str: string): boolean =>
  str.toLowerCase() === "true";

export const boolToString = (b: boolean): string =>
  b === true ? "true" : "false";

export const stringToTypedArray = <T>(str: string): T[] => {
  return str ? str.split(",").map((s) => s as T) : [];
};

export const getReactingUsers = (
  exportReactions: ExportReaction[],
  userMap: ExportUserMap,
  selectedGuild: Guild | null | undefined,
): ExportReaction[] => {
  return exportReactions
    .filter(({ id: userId }) => userMap[userId])
    .map(({ id: userId, burst }) => {
      const mapping = userMap[userId];
      const guildNickName = selectedGuild
        ? mapping?.guilds?.[selectedGuild.id]?.nick
        : null;

      return {
        id: userId,
        burst,
        username: mapping.userName ?? undefined,
        displayName: guildNickName || mapping.displayName,
        avatar: mapping.avatar,
      };
    });
};

export const isThreadMessage = (message?: Message, threads: Channel[] = []) => {
  return !!message?.thread || threads.some((t) => t.id === message?.channel_id);
};

export const isNonStandardMessage = (message: Message) => {
  const nonStandardTypes = [
    MessageType.CALL,
    MessageType.CHANNEL_PINNED_MESSAGE,
  ];
  return nonStandardTypes.some((v) => messageTypeEquals(message.type, v));
};

export const messageTypeEquals = (type: number, compareType: MessageType) => {
  return `${type}` === compareType;
};

export const isRemovableMessage = (message: Message): boolean => {
  return ![
    MessageType.RECIPIENT_ADD,
    MessageType.RECIPIENT_REMOVE,
    MessageType.CALL,
    MessageType.CHANNEL_NAME_CHANGE,
    MessageType.CHANNEL_ICON_CHANGE,
    MessageType.THREAD_STARTER_MESSAGE,
  ].some((t) => messageTypeEquals(message.type, t));
};

export const isCriteriaActive = (searchCritera: SearchCriteria) => {
  const {
    searchBeforeDate,
    searchAfterDate,
    searchMessageContent,
    selectedHasTypes,
    userIds,
    isPinned,
    mentionIds,
    channelIds,
  } = searchCritera;
  return [
    searchBeforeDate,
    searchAfterDate,
    searchMessageContent,
    selectedHasTypes.length,
    userIds.length,
    isPinned !== IsPinnedType.UNSET,
    mentionIds.length,
    channelIds.length,
  ].some((c) => c);
};

export const isUserDataStale = (
  timestamp: number = new Date().getTime(),
  appUserDataRefreshRate: string,
) => {
  if (appUserDataRefreshRate === UserDataRefreshRate.ALWAYS) {
    return true;
  }

  const today = new Date();
  let staleDate = toDate(timestamp);

  switch (appUserDataRefreshRate) {
    case UserDataRefreshRate.HOURLY:
      staleDate = addSeconds(staleDate, 3600);
      break;
    case UserDataRefreshRate.DAILY: {
      staleDate = addDays(staleDate, 1);
      break;
    }
    case UserDataRefreshRate.WEEKLY: {
      staleDate = addDays(staleDate, 7);
      break;
    }
    case UserDataRefreshRate.MONTHLY: {
      staleDate = addDays(staleDate, 30);
      break;
    }
    case UserDataRefreshRate.NEVER: {
      staleDate = addDays(staleDate, 5000);
      break;
    }
    default:
      break;
  }

  return isAfter(today, staleDate);
};

/**
 * Sort and return the provided Channel array by name.
 * @param channels
 */
export const getSortedChannels = (channels: Channel[]): Channel[] => {
  return channels
    .map((c) => ({ ...c }))
    .sort((a, b) =>
      sortByProperty(
        { name: String(a.name).toLowerCase() },
        { name: String(b.name).toLowerCase() },
        "name",
      ),
    );
};

/**
 * Sort and return the provided Guild array by name.
 * @param guilds
 */
export const getSortedGuilds = (guilds: Guild[]): Guild[] => {
  return guilds
    .map((g) => ({ ...g }))
    .sort((a, b) =>
      sortByProperty(
        { name: a.name.toLowerCase() },
        { name: b.name.toLowerCase() },
        "name",
      ),
    );
};

/**
 * Sort and return messages by their date
 * @param messages
 * @param sortDirection
 */
export const getSortedMessages = (
  messages: Message[],
  sortDirection: SortDirection = SortDirection.DESCENDING,
): Message[] => {
  return messages
    .map((m) => ({ ...m }))
    .sort((a, b) =>
      sortByProperty(
        { ts: new Date(a.timestamp).getTime() },
        { ts: new Date(b.timestamp).getTime() },
        "ts",
        sortDirection,
      ),
    );
};

export const isSearchComplete = (
  searchOffSet: number = START_OFFSET,
  completeCount: number = START_OFFSET,
) => {
  return searchOffSet >= completeCount;
};

export const getUserMappingData = (user: User) => {
  return {
    userName: user.username,
    displayName: user.global_name,
    avatar: user.avatar,
    timestamp: Date.now(),
  };
};

export const getGMOMappingData = (gmo: GuildMemberObject) => {
  return {
    roles: gmo.roles,
    nick: gmo.nick,
    joinedAt: format(parseISO(gmo.joined_at), "MMM d, yyyy"),
    timestamp: Date.now(),
  };
};

export const defaultGMOMappingData = {
  roles: [],
  nick: null,
  joinedAt: null,
  timestamp: Date.now(),
};

/**
 * Filter only for values that do not exist on both a1 and a2
 * @param value
 * @param a1
 * @param a2
 */
export const filterBoth = <T>(value: T[], a1: T[], a2: T[]) => {
  return value.filter(
    (id) => !a1.some((uId) => uId === id) && !a2.some((uId) => uId === id),
  );
};

export const getTagName = (type: Tag): string => {
  switch (type) {
    case Tag.TAGS_MADE_BY_USER:
      return "Tags Sent By User";
    case Tag.TAGGED_USERS:
      return "Tags Received For User";
    default:
      return "";
  }
};

export const getThreadEntityName = (thread: Channel) => {
  return thread.name ? getOsSafeString(thread.name) : `Thread ${thread.id}`;
};

/**
 * Extract unique threads from messages that aren't already known
 * @param messages Array of messages to extract threads from
 * @param knownThreads Array of threads already known
 * @returns Array of new unique threads found in messages
 */
export const getThreadsFromMessages = (
  messages: Message[],
  knownThreads: Channel[],
): Channel[] => {
  const foundThreads: Channel[] = [];
  messages.forEach((message) => {
    if (message.thread && message.thread.id) {
      foundThreads.push(message.thread);
    }
  });

  return foundThreads.filter(
    (thread) =>
      !knownThreads.some((knownThread) => knownThread.id === thread.id),
  );
};

/**
 * Filter out duplicate threads from a list
 * @param threads Threads to filter
 * @param knownThreads Threads already known
 * @returns Filtered list without duplicates
 */
export const filterDuplicateThreads = (
  threads: Channel[],
  knownThreads: Channel[],
): Channel[] => {
  return threads.filter(
    (thread) =>
      !knownThreads.some((knownThread) => knownThread.id === thread.id),
  );
};

/**
 * Retrieve a filtered array of threads where one or more messages exist for it in the provided messages
 * @param threads
 * @param messages
 */
export const filterThreadsByMessages = (
  threads: Channel[],
  messages: Message[],
) => {
  return threads.filter((t) =>
    messages.some((m) => m.thread?.id === t.id || m.channel_id === t.id),
  );
};

/**
 * Generate a 10-digit long filesystem UUID
 */
export const getFsUUID = () => getOsSafeString(nanoid(10));

/**
 * Normalizes a partial Guild object to ensure all required properties exist.
 * This ensures the object will pass the isGuild type guard.
 * @param partial Partial guild object from API
 * @returns Normalized guild with all required properties
 */
export const normalizeGuild = (partial: Partial<Guild>): Guild =>
  ({
    ...partial,
    emojis: partial.emojis ?? [],
    roles: partial.roles ?? [],
  }) as Guild;

/**
 * Get display name for a DM channel
 * @param dm The DM channel
 * @returns Formatted name for the DM
 */
export const getDmName = (dm: Channel): string => {
  const { recipients, name, id } = dm;
  if (recipients?.length === 1) {
    return recipients[0].username;
  }
  return `${name ? "" : "Unnamed "}Group Chat - ${name || id}`;
};

/**
 * Extract recipients from DM channels as a list of users
 * @param dms Array of DM channels
 * @returns Array of recipients with id and name
 */
export const getDmRecipients = (
  dms: Channel[],
): Array<{ id: string; name: string }> => {
  const recipients: Array<{ id: string; name: string }> = [];
  dms.forEach((dm) => {
    if (dm.recipients?.length) {
      recipients.push(
        ...dm.recipients.map((r) => ({ name: r.username, id: r.id })),
      );
    }
  });
  return recipients;
};

/**
 * Create pre-filter users list from userMap for a specific guild
 * @param userMap The export user map
 * @param guildId The guild ID to filter by
 * @param currentUserId Optional current user ID to include at end of list
 * @param currentUsername Optional current username
 * @returns Sorted array of users that belong to the guild
 */
export const createPreFilterUsers = (
  userMap: ExportUserMap,
  guildId: string,
  currentUserId?: string,
  currentUsername?: string,
): Array<{ id: string; name: string }> => {
  const preFilterUsers = Object.keys(userMap)
    .map((key) => {
      const mapping = userMap[key];
      return { name: mapping.userName || "Unknown User", id: key };
    })
    .filter(
      (mapping) =>
        mapping.id !== currentUserId &&
        Boolean(userMap[mapping.id]?.guilds[guildId]) &&
        mapping.name !== "User Not Found",
    );

  // Add current user at the end if provided
  if (currentUserId && currentUsername) {
    preFilterUsers.push({ id: currentUserId, name: currentUsername });
  }

  return preFilterUsers.sort((a, b) =>
    sortByProperty(a, b, "name", SortDirection.ASCENDING),
  );
};

// ─── Forward message helpers (#197) ────────────────────────────────────
// Discord's Forward Message feature (late 2024) attaches the original
// payload to the receiving message as `message_snapshots[].message`.
// The receiving message itself is type 0 with empty content and
// `message_reference.type === 1` (FORWARD vs 0 = DEFAULT/REPLY). These
// helpers converge consumer code paths on one definition of "is this a
// forward" and "where is its payload" so emitters don't each re-derive.

/**
 * True when a message is a forwarded message (carries a snapshot of the
 * original payload). Detected by snapshot presence, which is the
 * load-bearing field; the `message_reference.type === 1` discriminator
 * is metadata that may or may not be present depending on Discord's
 * response shape.
 */
export const isForwardedMessage = (
  message: Pick<Message, "message_snapshots" | "message_reference">,
): boolean => {
  return Array.isArray(message.message_snapshots) && message.message_snapshots.length > 0;
};

/**
 * Returns the inner Message payload of the first snapshot when the
 * input is a forwarded message, or null when it isn't. The inner
 * payload is intentionally a Partial<Message>: Discord strips `author`
 * for privacy and only includes the fields the original message
 * carried (content, attachments, embeds, mentions, timestamp, flags).
 */
export const getForwardedSnapshot = (
  message: Pick<Message, "message_snapshots">,
): Partial<Message> | null => {
  if (!Array.isArray(message.message_snapshots) || message.message_snapshots.length === 0) {
    return null;
  }
  const first = message.message_snapshots[0];
  return first?.message ?? null;
};

// ─── Message + date + user-display utils promoted from consumer (#195 cluster B) ───

const THREAD_STARTER_MESSAGE_TYPE = 21;

/**
 * Returns the effective display content for a message. Type 21 (thread
 * starter) messages have empty `content` — the actual text lives in
 * `referenced_message.content`. Promoted from the discrub consumer's
 * `src/utils/messageUtils.ts` so lib-side emitters (textEmitter et al)
 * can stay self-contained.
 */
export const getMessageContent = (message: Message): string => {
  if (message.type === THREAD_STARTER_MESSAGE_TYPE && message.referenced_message?.content) {
    return message.referenced_message.content;
  }
  return message.content || "";
};

/**
 * Format a message timestamp using configured date and time formats.
 * Both are date-fns format strings. Promoted from the discrub
 * consumer's `src/utils/dateUtils.ts`. `date-fns` is already a lib
 * dependency (see imports above).
 */
export const formatMessageTimestamp = (
  date: Date | string,
  dateFormat: string,
  timeFormat: string,
): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, `${dateFormat} ${timeFormat}`);
};

/**
 * Resolved per-user display fields used by exports. Strings carry their
 * cached values or null when absent.
 */
export interface UserDisplayData {
  username: string | null;
  displayName: string | null;
  nickname: string | null;
}

/**
 * Resolve a user's display fields against the cached user map.
 * Promoted from the discrub consumer's `src/utils/userDisplayUtils.ts`.
 * Settings-aware in the consumer's `getDisplayName` variant; this
 * lib-side helper returns the raw fields and leaves priority decisions
 * to the caller.
 */
export const getUserDisplayData = (
  userId: string,
  userMap: ExportUserMap,
  guildId: string | null,
): UserDisplayData => {
  const cachedUser = userMap[userId];
  const username = cachedUser?.userName || null;
  const displayName = cachedUser?.displayName || null;
  const nickname =
    guildId && cachedUser?.guilds?.[guildId]?.nick
      ? cachedUser.guilds[guildId].nick!
      : null;
  return { username, displayName, nickname };
};
