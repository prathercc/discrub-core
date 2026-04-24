import { describe, it, expect } from "vitest";
import {
  formatSystemMessage,
  isSystemMessageType,
  SystemMessageKind,
  USER_JOIN_VARIANTS,
} from "./system-messages";
import type { Message } from "../types/discord/message";
import type { User } from "../types/discord/user";

const ALICE: User = {
  id: "111",
  username: "alice",
  discriminator: "0",
  global_name: "Alice",
  avatar: null,
};

const BOB: User = {
  id: "222",
  username: "bob",
  discriminator: "0",
  global_name: "Bob",
  avatar: null,
};

const makeMessage = (type: number, overrides: Partial<Message> = {}): Message =>
  ({
    id: "msg-1",
    channel_id: "chan-1",
    author: ALICE,
    content: "",
    timestamp: "2026-04-21T10:00:00.000Z",
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type,
    ...overrides,
  }) as Message;

describe("isSystemMessageType", () => {
  it.each([
    [0, false],   // DEFAULT
    [19, false],  // REPLY
    [20, false],  // CHAT_INPUT_COMMAND
    [21, false],  // THREAD_STARTER_MESSAGE
    [23, false],  // CONTEXT_MENU_COMMAND
    [1, true],    // RECIPIENT_ADD
    [6, true],    // CHANNEL_PINNED_MESSAGE
    [7, true],    // USER_JOIN
    [18, true],   // THREAD_CREATED
    [46, true],   // POLL_RESULT
    [99, true],   // Unknown → render as generic system notice
  ])("type %i → isSystemMessageType = %s", (type, expected) => {
    expect(isSystemMessageType(type)).toBe(expected);
  });
});

describe("formatSystemMessage", () => {
  it.each([0, 19, 20, 21, 23])("returns null for non-system type %i", (type) => {
    expect(formatSystemMessage(makeMessage(type))).toBeNull();
  });

  describe("group-DM membership", () => {
    it("type 1 RECIPIENT_ADD", () => {
      const msg = makeMessage(1, { mentions: [BOB] });
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.RECIPIENT_ADD,
        text: "**Alice** added **Bob** to the group.",
      });
    });

    it("type 2 RECIPIENT_REMOVE", () => {
      const msg = makeMessage(2, { mentions: [BOB] });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** removed **Bob** from the group.",
      );
    });

    it("falls back gracefully when mentions array is empty", () => {
      const msg = makeMessage(1, { mentions: [] });
      // bold("") returns "" rather than "****" — keeps the rendered
      // output clean when we don't have a name to show.
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** added  to the group.",
      );
    });
  });

  describe("call", () => {
    it("type 3 CALL without duration", () => {
      const msg = makeMessage(3);
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.CALL,
        text: "**Alice** started a call.",
      });
    });

    it("type 3 CALL with duration (ended_timestamp set)", () => {
      const msg = makeMessage(3, {
        timestamp: "2026-04-21T10:00:00.000Z",
        call: {
          ended_timestamp: "2026-04-21T10:02:30.000Z",
          participants: ["111", "222"],
        } as Message["call"],
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** started a call — lasted 2m 30s.",
      );
    });

    it("type 3 CALL with multi-hour duration", () => {
      const msg = makeMessage(3, {
        timestamp: "2026-04-21T10:00:00.000Z",
        call: {
          ended_timestamp: "2026-04-21T12:45:00.000Z",
          participants: ["111"],
        } as Message["call"],
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** started a call — lasted 2h 45m.",
      );
    });

    it("type 3 CALL with seconds-only duration", () => {
      const msg = makeMessage(3, {
        timestamp: "2026-04-21T10:00:00.000Z",
        call: {
          ended_timestamp: "2026-04-21T10:00:15.000Z",
          participants: ["111"],
        } as Message["call"],
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** started a call — lasted 15s.",
      );
    });
  });

  describe("channel edits (group DM)", () => {
    it("type 4 CHANNEL_NAME_CHANGE with content", () => {
      const msg = makeMessage(4, { content: "new-name" });
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.CHANNEL_EDIT,
        text: "**Alice** changed the channel name: **new-name**.",
      });
    });

    it("type 4 without content reads as removal", () => {
      const msg = makeMessage(4);
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** removed the channel name.",
      );
    });

    it("type 5 CHANNEL_ICON_CHANGE", () => {
      const msg = makeMessage(5);
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** changed the channel icon.",
      );
    });
  });

  describe("pin", () => {
    it("type 6 CHANNEL_PINNED_MESSAGE includes the 'See all pinned messages' suffix", () => {
      const msg = makeMessage(6);
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.PIN,
        text: "**Alice** pinned a message to this channel. See all pinned messages.",
      });
    });
  });

  describe("user join", () => {
    it("type 7 USER_JOIN picks a variant deterministically from timestamp", () => {
      const timestamp = "2026-04-21T10:00:00.000Z";
      const ms = new Date(timestamp).getTime();
      const msg = makeMessage(7, { timestamp });
      expect(formatSystemMessage(msg)?.kind).toBe(SystemMessageKind.JOIN);
      const expected = USER_JOIN_VARIANTS[ms % USER_JOIN_VARIANTS.length].replace(
        "{author}",
        "**Alice**",
      );
      expect(formatSystemMessage(msg)?.text).toBe(expected);
    });

    it("same message always resolves to the same variant (determinism)", () => {
      const msg = makeMessage(7, { timestamp: "2026-04-21T10:00:00.000Z" });
      const first = formatSystemMessage(msg)?.text;
      const second = formatSystemMessage(msg)?.text;
      expect(first).toBe(second);
    });

    it("handles an unparseable timestamp by defaulting to variant 0", () => {
      const msg = makeMessage(7, { timestamp: "not-a-date" });
      expect(formatSystemMessage(msg)?.text).toBe(
        USER_JOIN_VARIANTS[0].replace("{author}", "**Alice**"),
      );
    });

    it("exposes exactly 13 variants", () => {
      expect(USER_JOIN_VARIANTS).toHaveLength(13);
    });
  });

  describe("boosts", () => {
    it("type 8 GUILD_BOOST without streak", () => {
      const msg = makeMessage(8);
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.BOOST,
        text: "**Alice** just boosted the server!",
      });
    });

    it("type 8 GUILD_BOOST with streak count in content", () => {
      const msg = makeMessage(8, { content: "3" });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** just boosted the server **3 times**!",
      );
    });

    it.each([
      [9, 1],
      [10, 2],
      [11, 3],
    ])("type %i GUILD_BOOST_TIER_%i uses tier", (type, tier) => {
      const msg = makeMessage(type);
      expect(formatSystemMessage(msg, { guildName: "Aquarium" })?.text).toBe(
        `**Alice** just boosted the server! **Aquarium** has achieved **Level ${tier}**!`,
      );
    });

    it("boost tier falls back to 'the server' when guildName unset", () => {
      const msg = makeMessage(10);
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** just boosted the server! **the server** has achieved **Level 2**!",
      );
    });
  });

  describe("channel follow", () => {
    it("type 12 CHANNEL_FOLLOW_ADD with content", () => {
      const msg = makeMessage(12, { content: "#news" });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** has added **#news** to this channel. Its most important updates will show up here.",
      );
    });
  });

  describe("discovery warnings", () => {
    it.each([14, 15, 16, 17])("type %i GUILD_DISCOVERY_* → kind=DISCOVERY", (type) => {
      const result = formatSystemMessage(makeMessage(type));
      expect(result?.kind).toBe(SystemMessageKind.DISCOVERY);
      expect(result?.text.length).toBeGreaterThan(0);
    });
  });

  describe("thread created", () => {
    it("type 18 THREAD_CREATED with message.thread.name", () => {
      const msg = makeMessage(18, {
        thread: { name: "Project planning" } as Message["thread"],
      });
      expect(formatSystemMessage(msg)).toEqual({
        kind: SystemMessageKind.THREAD,
        text: "**Alice** started a thread: **Project planning**. See all threads.",
      });
    });

    it("type 18 falls back to content when thread is absent", () => {
      const msg = makeMessage(18, { content: "Fallback title" });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** started a thread: **Fallback title**. See all threads.",
      );
    });
  });

  describe("invite reminder", () => {
    it("type 22 GUILD_INVITE_REMINDER", () => {
      expect(formatSystemMessage(makeMessage(22))).toEqual({
        kind: SystemMessageKind.INVITE_REMINDER,
        text: "Wondering who to invite? Start by inviting anyone who can help you build the server!",
      });
    });
  });

  describe("auto moderation", () => {
    it("type 24 AUTO_MODERATION_ACTION signals embed rendering", () => {
      const result = formatSystemMessage(makeMessage(24));
      expect(result?.kind).toBe(SystemMessageKind.AUTO_MOD);
      expect(result?.showEmbed).toBe(true);
    });
  });

  describe("role subscription purchase", () => {
    it("type 25 joined (first time)", () => {
      const msg = makeMessage(25, {
        role_subscription_data: {
          tier_name: "Gold",
          is_renewal: false,
          total_months_subscribed: 1,
          role_subscription_listing_id: "x",
        } as Message["role_subscription_data"],
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** joined **Gold** (1 month).",
      );
    });

    it("type 25 renewed with multiple months", () => {
      const msg = makeMessage(25, {
        role_subscription_data: {
          tier_name: "Platinum",
          is_renewal: true,
          total_months_subscribed: 12,
          role_subscription_listing_id: "x",
        } as Message["role_subscription_data"],
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Alice** renewed **Platinum** (12 months).",
      );
    });
  });

  describe("stage", () => {
    it.each([
      [27, "started", "**Alice** started **Topic**."],
      [28, "ended", "**Alice** ended **Topic**."],
      [31, "topic change", "**Alice** changed the Stage topic: **Topic**."],
    ])("type %i produces the expected text", (type, _label, expected) => {
      const msg = makeMessage(type, { content: "Topic" });
      expect(formatSystemMessage(msg)?.text).toBe(expected);
    });

    it("type 29 STAGE_SPEAKER", () => {
      expect(formatSystemMessage(makeMessage(29))?.text).toBe(
        "**Alice** is now a speaker.",
      );
    });
  });

  describe("incidents and premium", () => {
    it("type 32 GUILD_APPLICATION_PREMIUM_SUBSCRIPTION", () => {
      expect(formatSystemMessage(makeMessage(32))?.kind).toBe(
        SystemMessageKind.APP_PREMIUM,
      );
    });

    it("type 36/37 alert mode toggles", () => {
      expect(formatSystemMessage(makeMessage(36, { content: "2026-04-21T12:00:00Z" }))?.text).toContain(
        "enabled security actions",
      );
      expect(formatSystemMessage(makeMessage(37))?.text).toBe(
        "**Alice** disabled security actions.",
      );
    });

    it("type 38/39 raid reports include guild name", () => {
      expect(formatSystemMessage(makeMessage(38), { guildName: "Aquarium" })?.text).toBe(
        "**Alice** reported a raid in **Aquarium**.",
      );
      expect(formatSystemMessage(makeMessage(39), { guildName: "Aquarium" })?.text).toBe(
        "**Alice** reported a false alarm in **Aquarium**.",
      );
    });
  });

  describe("purchase and poll result", () => {
    it("type 44 PURCHASE_NOTIFICATION", () => {
      expect(formatSystemMessage(makeMessage(44))?.kind).toBe(
        SystemMessageKind.PURCHASE,
      );
    });

    it("type 46 POLL_RESULT signals embed rendering", () => {
      const result = formatSystemMessage(makeMessage(46));
      expect(result?.kind).toBe(SystemMessageKind.POLL_RESULT);
      expect(result?.showEmbed).toBe(true);
    });
  });

  describe("unknown types", () => {
    it("returns a generic placeholder with OTHER kind", () => {
      const result = formatSystemMessage(makeMessage(99));
      expect(result).toEqual({
        kind: SystemMessageKind.OTHER,
        text: "System event (type 99).",
      });
    });
  });

  describe("author fallback", () => {
    it("uses username when global_name is absent", () => {
      const msg = makeMessage(6, {
        author: { ...ALICE, global_name: null },
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**alice** pinned a message to this channel. See all pinned messages.",
      );
    });

    it("renders 'Unknown' if the author is missing entirely", () => {
      const msg = makeMessage(6, { author: undefined as unknown as User });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**Unknown** pinned a message to this channel. See all pinned messages.",
      );
    });
  });

  describe("markdown safety", () => {
    it("escapes asterisks in author display names", () => {
      const msg = makeMessage(6, {
        author: { ...ALICE, global_name: "**sneaky**" },
      });
      expect(formatSystemMessage(msg)?.text).toBe(
        "**\\*\\*sneaky\\*\\*** pinned a message to this channel. See all pinned messages.",
      );
    });
  });
});
