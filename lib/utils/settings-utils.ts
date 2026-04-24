import type { AppSettings } from "../types/discrub-types.ts";
import type { DiscrubSetting } from "../enum/discrub-enum.ts";

/**
 * Typed accessor helpers for AppSettings.
 *
 * All settings are persisted as strings in localStorage.
 * These helpers provide type-safe reads without changing the
 * persistence layer.
 */
export const SettingsHelper = {
  /** Returns true when the setting value is the string 'true'. */
  isEnabled: (settings: AppSettings, key: DiscrubSetting): boolean =>
    settings[key] === "true",

  /** Parses the setting as a number, returning `fallback` when the value is missing, empty, or NaN. */
  getNumber: (
    settings: AppSettings,
    key: DiscrubSetting,
    fallback: number,
  ): number => {
    const raw = settings[key];
    if (raw === undefined || raw === null || raw === "") return fallback;
    const val = Number(raw);
    return isNaN(val) ? fallback : val;
  },

  /** Returns the setting as a string, or `fallback` when the value is falsy. */
  getString: (
    settings: AppSettings,
    key: DiscrubSetting,
    fallback: string,
  ): string => settings[key] || fallback,
};
