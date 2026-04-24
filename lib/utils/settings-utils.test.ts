import { describe, it, expect } from "vitest";
import { SettingsHelper } from "./settings-utils.ts";
import { DiscrubSetting } from "../enum/discrub-enum.ts";
import type { AppSettings } from "../types/discrub-types.ts";

describe("SettingsHelper", () => {
  const makeSettings = (
    overrides: Partial<Record<DiscrubSetting, string>> = {},
  ): AppSettings =>
    ({
      [DiscrubSetting.REACTIONS_ENABLED]: "true",
      [DiscrubSetting.SEARCH_DELAY]: "2",
      [DiscrubSetting.DELETE_DELAY]: "1.5",
      [DiscrubSetting.DELAY_MODIFIER]: "0.5",
      [DiscrubSetting.DATE_FORMAT]: "MM/DD/YYYY",
      ...overrides,
    }) as AppSettings;

  describe("isEnabled", () => {
    it('returns true when value is "true"', () => {
      const settings = makeSettings({
        [DiscrubSetting.REACTIONS_ENABLED]: "true",
      });
      expect(
        SettingsHelper.isEnabled(settings, DiscrubSetting.REACTIONS_ENABLED),
      ).toBe(true);
    });

    it('returns false when value is "false"', () => {
      const settings = makeSettings({
        [DiscrubSetting.REACTIONS_ENABLED]: "false",
      });
      expect(
        SettingsHelper.isEnabled(settings, DiscrubSetting.REACTIONS_ENABLED),
      ).toBe(false);
    });

    it("returns false when value is undefined", () => {
      const settings = makeSettings({
        [DiscrubSetting.REACTIONS_ENABLED]: undefined as any,
      });
      expect(
        SettingsHelper.isEnabled(settings, DiscrubSetting.REACTIONS_ENABLED),
      ).toBe(false);
    });

    it("returns false when value is an arbitrary string", () => {
      const settings = makeSettings({
        [DiscrubSetting.REACTIONS_ENABLED]: "yes",
      });
      expect(
        SettingsHelper.isEnabled(settings, DiscrubSetting.REACTIONS_ENABLED),
      ).toBe(false);
    });
  });

  describe("getNumber", () => {
    it("parses a valid numeric string", () => {
      const settings = makeSettings({ [DiscrubSetting.SEARCH_DELAY]: "3.5" });
      expect(
        SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 0),
      ).toBe(3.5);
    });

    it("returns fallback for empty string", () => {
      const settings = makeSettings({ [DiscrubSetting.SEARCH_DELAY]: "" });
      expect(
        SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 42),
      ).toBe(42);
    });

    it("returns fallback for non-numeric string", () => {
      const settings = makeSettings({
        [DiscrubSetting.SEARCH_DELAY]: "abc",
      });
      expect(
        SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 7),
      ).toBe(7);
    });

    it("returns 0 for the string '0'", () => {
      const settings = makeSettings({ [DiscrubSetting.SEARCH_DELAY]: "0" });
      expect(
        SettingsHelper.getNumber(settings, DiscrubSetting.SEARCH_DELAY, 99),
      ).toBe(0);
    });
  });

  describe("getString", () => {
    it("returns the stored value", () => {
      const settings = makeSettings({
        [DiscrubSetting.DATE_FORMAT]: "YYYY-MM-DD",
      });
      expect(
        SettingsHelper.getString(
          settings,
          DiscrubSetting.DATE_FORMAT,
          "default",
        ),
      ).toBe("YYYY-MM-DD");
    });

    it("returns fallback for empty string", () => {
      const settings = makeSettings({ [DiscrubSetting.DATE_FORMAT]: "" });
      expect(
        SettingsHelper.getString(
          settings,
          DiscrubSetting.DATE_FORMAT,
          "fallback",
        ),
      ).toBe("fallback");
    });

    it("returns fallback for undefined", () => {
      const settings = makeSettings({
        [DiscrubSetting.DATE_FORMAT]: undefined as any,
      });
      expect(
        SettingsHelper.getString(
          settings,
          DiscrubSetting.DATE_FORMAT,
          "fallback",
        ),
      ).toBe("fallback");
    });
  });
});
