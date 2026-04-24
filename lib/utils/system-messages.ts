import type { Message } from "../types/discord/message";
import type { User } from "../types/discord/user";

/**
 * System-message formatting helpers.
 *
 * Discord's client renders non-default message types as stylized one-liners
 * ("Alice pinned a message to this channel." etc.). The templates are
 * documented at https://docs.discord.food/resources/message under
 * "Rendered Content" — these functions mirror them for both the in-app
 * feed and the HTML export pipeline.
 *
 * Output strings use Discord-style `**bold**` markdown for the author name
 * and other emphasized tokens, so callers can pipe the result through the
 * existing `formatContentAsHtml`/markdown renderer and get consistent
 * styling.
 */

/**
 * Semantic bucket for a system message. Consumed by the feed to pick an
 * icon; purely presentational. Message types that produce the same icon
 * share a kind (e.g. all four boost tiers → `BOOST`).
 */
export enum SystemMessageKind {
  RECIPIENT_ADD = "recipientAdd",
  RECIPIENT_REMOVE = "recipientRemove",
  CALL = "call",
  CHANNEL_EDIT = "channelEdit",
  PIN = "pin",
  JOIN = "join",
  BOOST = "boost",
  CHANNEL_FOLLOW = "channelFollow",
  DISCOVERY = "discovery",
  THREAD = "thread",
  INVITE_REMINDER = "inviteReminder",
  AUTO_MOD = "autoMod",
  ROLE_SUBSCRIPTION = "roleSubscription",
  PREMIUM_UPSELL = "premiumUpsell",
  STAGE = "stage",
  APP_PREMIUM = "appPremium",
  INCIDENT = "incident",
  PURCHASE = "purchase",
  POLL_RESULT = "pollResult",
  OTHER = "other",
}

export type SystemMessageDescriptor = {
  kind: SystemMessageKind;
  /** Rendered string with Discord-style `**bold**` markdown already applied. */
  text: string;
  /**
   * True when the payload's meaning lives in `message.embeds[0]` rather
   * than a template string — specifically AUTO_MODERATION_ACTION and
   * POLL_RESULT. Caller should render the embed beneath (or in place of)
   * the notice line.
   */
  showEmbed?: boolean;
};

export type FormatSystemMessageOptions = {
  /** Guild display name, for boost-tier and incident templates. */
  guildName?: string;
};

/**
 * The 13 USER_JOIN welcome lines Discord rotates through. Selection is
 * deterministic: `(parseInt(timestamp_ms) % 13)`. Documented at
 * https://docs.discord.food/resources/message — types array table.
 */
export const USER_JOIN_VARIANTS: readonly string[] = [
  "{author} joined the party.",
  "{author} is here.",
  "Welcome, {author}. We hope you brought pizza.",
  "A wild {author} appeared.",
  "{author} just landed.",
  "{author} just slid into the server.",
  "{author} just showed up!",
  "Welcome {author}. Say hi!",
  "{author} hopped into the server.",
  "Everyone welcome {author}!",
  "Glad you're here, {author}.",
  "Good to see you, {author}.",
  "Yay you made it, {author}!",
];

/**
 * Types that should render as normal messages (not system notices):
 * - 0  DEFAULT
 * - 19 REPLY (has reply-bar UI)
 * - 20 CHAT_INPUT_COMMAND (user-sent slash command; `content` is real)
 * - 21 THREAD_STARTER_MESSAGE (parent of a thread; `referenced_message.content`)
 * - 23 CONTEXT_MENU_COMMAND (similar to 20)
 */
const NON_SYSTEM_TYPES = new Set<number>([0, 19, 20, 21, 23]);

export const isSystemMessageType = (
  type: number | undefined | null,
): boolean =>
  type !== undefined && type !== null && !NON_SYSTEM_TYPES.has(type);

/**
 * Returns a descriptor for rendering the given message as a Discord-style
 * system notice, or `null` when the message should be rendered as a normal
 * message (type 0/19/20/21/23).
 */
export function formatSystemMessage(
  message: Message,
  options: FormatSystemMessageOptions = {},
): SystemMessageDescriptor | null {
  const { type } = message;
  if (!isSystemMessageType(type)) return null;

  const author = bold(getAuthorDisplay(message.author));
  const mention = bold(getMentionDisplay(message.mentions?.[0]));
  const content = message.content ?? "";
  const guildName = options.guildName ? bold(options.guildName) : bold("the server");
  const threadName =
    message.thread?.name ? bold(message.thread.name) : content ? bold(content) : bold("thread");

  switch (type) {
    case 1: // RECIPIENT_ADD
      return {
        kind: SystemMessageKind.RECIPIENT_ADD,
        text: `${author} added ${mention} to the group.`,
      };
    case 2: // RECIPIENT_REMOVE
      return {
        kind: SystemMessageKind.RECIPIENT_REMOVE,
        text: `${author} removed ${mention} from the group.`,
      };
    case 3: {
      // CALL — message.call?.ended_timestamp gives call duration when ended.
      const duration = formatCallDuration(message);
      const suffix = duration ? ` — lasted ${duration}` : "";
      return {
        kind: SystemMessageKind.CALL,
        text: `${author} started a call${suffix}.`,
      };
    }
    case 4: // CHANNEL_NAME_CHANGE
      return {
        kind: SystemMessageKind.CHANNEL_EDIT,
        text: content
          ? `${author} changed the channel name: ${bold(content)}.`
          : `${author} removed the channel name.`,
      };
    case 5: // CHANNEL_ICON_CHANGE
      return {
        kind: SystemMessageKind.CHANNEL_EDIT,
        text: `${author} changed the channel icon.`,
      };
    case 6: // CHANNEL_PINNED_MESSAGE
      // userdoccers lists "{author} pinned a message to this channel." but
      // Discord's actual client appends the "See all pinned messages." link
      // after the sentence. We include it here so the renderer can linkify
      // consistently across PIN (type 6) and THREAD_CREATED (type 18).
      return {
        kind: SystemMessageKind.PIN,
        text: `${author} pinned a message to this channel. See all pinned messages.`,
      };
    case 7: {
      // USER_JOIN — (timestamp_ms % 13) picks one of 13 variants.
      const variant = pickJoinVariant(message.timestamp);
      return {
        kind: SystemMessageKind.JOIN,
        text: variant.replace("{author}", author),
      };
    }
    case 8:
      // GUILD_BOOST — content holds the streak count when present.
      return {
        kind: SystemMessageKind.BOOST,
        text: content
          ? `${author} just boosted the server ${bold(`${content} times`)}!`
          : `${author} just boosted the server!`,
      };
    case 9:
    case 10:
    case 11: {
      // GUILD_BOOST_TIER_{1,2,3}
      const tier = type - 8; // 9→1, 10→2, 11→3
      return {
        kind: SystemMessageKind.BOOST,
        text: `${author} just boosted the server! ${guildName} has achieved ${bold(`Level ${tier}`)}!`,
      };
    }
    case 12: // CHANNEL_FOLLOW_ADD
      return {
        kind: SystemMessageKind.CHANNEL_FOLLOW,
        text: content
          ? `${author} has added ${bold(content)} to this channel. Its most important updates will show up here.`
          : `${author} has added a channel follow.`,
      };
    case 14: // GUILD_DISCOVERY_DISQUALIFIED
      return {
        kind: SystemMessageKind.DISCOVERY,
        text: "This server has been removed from Server Discovery because it no longer meets the requirements.",
      };
    case 15: // GUILD_DISCOVERY_REQUALIFIED
      return {
        kind: SystemMessageKind.DISCOVERY,
        text: "This server is eligible for Server Discovery again and has been re-added.",
      };
    case 16: // GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING
      return {
        kind: SystemMessageKind.DISCOVERY,
        text: "This server has failed Discovery activity requirements for 1 week. If it fails for 4 weeks in a row, it will be automatically removed from Discovery.",
      };
    case 17: // GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING
      return {
        kind: SystemMessageKind.DISCOVERY,
        text: "This server has failed Discovery activity requirements for 3 weeks in a row. If it fails for 1 more week, it will be removed from Discovery.",
      };
    case 18: // THREAD_CREATED
      return {
        kind: SystemMessageKind.THREAD,
        text: `${author} started a thread: ${threadName}. See all threads.`,
      };
    case 22: // GUILD_INVITE_REMINDER
      return {
        kind: SystemMessageKind.INVITE_REMINDER,
        text: "Wondering who to invite? Start by inviting anyone who can help you build the server!",
      };
    case 24: // AUTO_MODERATION_ACTION
      return {
        kind: SystemMessageKind.AUTO_MOD,
        text: "AutoMod flagged a message.",
        showEmbed: true,
      };
    case 25: {
      // ROLE_SUBSCRIPTION_PURCHASE
      const tierName = message.role_subscription_data?.tier_name;
      const isRenewal = message.role_subscription_data?.is_renewal;
      const months = message.role_subscription_data?.total_months_subscribed;
      const action = isRenewal ? "renewed" : "joined";
      const target = tierName ? bold(tierName) : bold("a role");
      const duration = months ? ` (${months} ${months === 1 ? "month" : "months"})` : "";
      return {
        kind: SystemMessageKind.ROLE_SUBSCRIPTION,
        text: `${author} ${action} ${target}${duration}.`,
      };
    }
    case 26: // INTERACTION_PREMIUM_UPSELL
      return {
        kind: SystemMessageKind.PREMIUM_UPSELL,
        text: content || "Upgrade for premium features.",
      };
    case 27: // STAGE_START
      return {
        kind: SystemMessageKind.STAGE,
        text: `${author} started ${bold(content || "a stage")}.`,
      };
    case 28: // STAGE_END
      return {
        kind: SystemMessageKind.STAGE,
        text: `${author} ended ${bold(content || "the stage")}.`,
      };
    case 29: // STAGE_SPEAKER
      return {
        kind: SystemMessageKind.STAGE,
        text: `${author} is now a speaker.`,
      };
    case 31: // STAGE_TOPIC
      return {
        kind: SystemMessageKind.STAGE,
        text: `${author} changed the Stage topic: ${bold(content || "(no topic)")}.`,
      };
    case 32: // GUILD_APPLICATION_PREMIUM_SUBSCRIPTION
      return {
        kind: SystemMessageKind.APP_PREMIUM,
        text: `${author} upgraded an app to premium.`,
      };
    case 36: // GUILD_INCIDENT_ALERT_MODE_ENABLED
      return {
        kind: SystemMessageKind.INCIDENT,
        text: content
          ? `${author} enabled security actions until ${bold(content)}.`
          : `${author} enabled security actions.`,
      };
    case 37: // GUILD_INCIDENT_ALERT_MODE_DISABLED
      return {
        kind: SystemMessageKind.INCIDENT,
        text: `${author} disabled security actions.`,
      };
    case 38: // GUILD_INCIDENT_REPORT_RAID
      return {
        kind: SystemMessageKind.INCIDENT,
        text: `${author} reported a raid in ${guildName}.`,
      };
    case 39: // GUILD_INCIDENT_REPORT_FALSE_ALARM
      return {
        kind: SystemMessageKind.INCIDENT,
        text: `${author} reported a false alarm in ${guildName}.`,
      };
    case 44: // PURCHASE_NOTIFICATION
      return {
        kind: SystemMessageKind.PURCHASE,
        text: `${author} has made a purchase.`,
      };
    case 46: // POLL_RESULT
      return {
        kind: SystemMessageKind.POLL_RESULT,
        text: "Poll results",
        showEmbed: true,
      };
    default:
      // Future/unknown types — render a safe placeholder so the row
      // isn't silently blank.
      return {
        kind: SystemMessageKind.OTHER,
        text: `System event (type ${type}).`,
      };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const bold = (s: string | undefined | null): string => (s ? `**${escapeMarkdown(s)}**` : "");

// Only escape `*` and `_` so the author's own name can't accidentally open
// markdown around the intended boldness. Everything else stays literal.
const escapeMarkdown = (s: string): string => s.replace(/([*_])/g, "\\$1");

const getAuthorDisplay = (user: User | undefined): string => {
  if (!user) return "Unknown";
  return user.global_name || user.username || "Unknown";
};

const getMentionDisplay = (user: User | undefined): string | undefined => {
  if (!user) return undefined;
  return user.global_name || user.username || undefined;
};

/**
 * Deterministic USER_JOIN variant picker: `(parseInt(timestamp_ms) % 13)`.
 * Mirrors Discord's client. For an ISO-8601 timestamp we convert to ms
 * epoch; for anything unparseable we fall back to variant 0.
 */
const pickJoinVariant = (timestamp: string | undefined): string => {
  if (!timestamp) return USER_JOIN_VARIANTS[0];
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return USER_JOIN_VARIANTS[0];
  const idx = ((ms % USER_JOIN_VARIANTS.length) + USER_JOIN_VARIANTS.length) % USER_JOIN_VARIANTS.length;
  return USER_JOIN_VARIANTS[idx];
};

/**
 * Format the duration of a call from `message.call`. Returns e.g. "2m 14s"
 * when the call has ended, or undefined for still-in-progress calls.
 */
const formatCallDuration = (message: Message): string | undefined => {
  const call = message.call;
  if (!call?.ended_timestamp) return undefined;
  const startMs = new Date(message.timestamp).getTime();
  const endMs = new Date(call.ended_timestamp).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return undefined;
  const diffSec = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
};
