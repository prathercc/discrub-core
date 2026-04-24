import type { Announcement, Donation } from "../types/discrub-types.ts";

const GITHUB_GIST_URL = "https://api.github.com/gists";
const ANNOUNCEMENT_ENDPOINT = `${GITHUB_GIST_URL}/e5558088744dbe52edca729425900a69`;
const DONATION_ENDPOINT = `${GITHUB_GIST_URL}/eb9a7ef2cf49ecab72adebeacea420bf`;
const ANNOUNCEMENT_MARKDOWN_ENDPOINT = `${GITHUB_GIST_URL}/a73736574a1a994e97cbc2d6f467c574`;

const fetchGist = <T>(
  endpoint: string,
  fileName: string,
  fallbackMsg: string,
  options?: { contentType?: string; parseJson?: boolean; fallbackValue?: T },
): Promise<T> => {
  const contentType = options?.contentType ?? "application/json";
  const parseJson = options?.parseJson ?? true;

  return fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": contentType,
    },
  })
    .then(async (resp) => {
      const gistData = await resp.json();
      const content = gistData?.files?.[fileName]?.content;
      return parseJson ? (JSON.parse(content) as T) : (content as T);
    })
    .catch((e) => {
      console.error(fallbackMsg, e);
      return (options?.fallbackValue !== undefined
        ? options.fallbackValue
        : undefined) as any;
    });
};

/**
 * Fetches announcement data from GitHub Gist
 * @returns Promise containing announcement revision and version info
 */
export const fetchAnnouncementData = (): Promise<Announcement> =>
  fetchGist<Announcement>(
    ANNOUNCEMENT_ENDPOINT,
    "announcement.json",
    "Error fetching announcement data",
  );

/**
 * Fetches announcement markdown content from GitHub Gist
 * @returns Promise containing announcement markdown string
 */
export const fetchAnnouncementMarkdown = (): Promise<string> =>
  fetchGist<string>(
    ANNOUNCEMENT_MARKDOWN_ENDPOINT,
    "announcement_markdown.md",
    "Error fetching announcement markdown",
    { contentType: "application/text", parseJson: false, fallbackValue: "" },
  );

/**
 * Fetches donation data from GitHub Gist
 * @returns Promise containing array of donation records
 */
export const fetchDonationData = (): Promise<Donation[]> =>
  fetchGist<Donation[]>(
    DONATION_ENDPOINT,
    "contributions.json",
    "Error fetching donations",
  );
