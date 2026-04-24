import type {
  Message,
  UserEnrichmentConfig,
  UserEnrichmentResult,
  ProgressPhase,
} from "../types.ts";
import type { ExportUserMap } from "../../types/discrub-types.ts";
import {
  getUserMappingData,
  getGMOMappingData,
  extractMentionedUserIds,
  isUserDataStale,
  defaultGMOMappingData,
} from "../utils.ts";
import { getEncodedEmoji } from "../utils.ts";

export class UserDataEnrichmentService {
  constructor(private config: UserEnrichmentConfig) {}

  /**
   * Enriches user data by fetching display names and guild-specific data
   */
  async enrichUserData(
    messages: Message[],
    guildId: string | null,
  ): Promise<UserEnrichmentResult> {
    const existingUserMap = this.config.existingUserMap || {};
    const reactionMap = this.config.existingReactionMap || {};
    const { settings } = this.config;

    const defaultMapping = {
      userName: null,
      displayName: null,
      avatar: null,
      guilds: {},
    };

    // Step 1: Collect all user IDs from messages, mentions, and reactions
    const userMap: ExportUserMap = {};

    messages.forEach((message) => {
      const { content, author, reactions } = message;
      const userId = author.id;

      // Add message author
      if (!userMap[userId]) {
        userMap[userId] = existingUserMap[userId] || {
          ...defaultMapping,
          userName: author.username,
          displayName: author.global_name,
          avatar: author.avatar,
        };
      }

      // Add mentioned users
      extractMentionedUserIds(content).forEach((mentionId) => {
        if (!userMap[mentionId]) {
          userMap[mentionId] = existingUserMap[mentionId] || defaultMapping;
        }
      });

      // Add reacting users
      if (settings.reactionsEnabled) {
        reactions?.forEach((reaction) => {
          const encodedEmoji = getEncodedEmoji(reaction.emoji);
          if (encodedEmoji) {
            const exportReactions = reactionMap[message.id]?.[encodedEmoji] || [];
            exportReactions.forEach(({ id: reactingUserId }) => {
              if (!userMap[reactingUserId]) {
                userMap[reactingUserId] =
                  existingUserMap[reactingUserId] || defaultMapping;
              }
            });
          }
        });
      }
    });

    // Step 2: Enrich user data
    const updateMap = { ...userMap };
    const userIds = Object.keys(updateMap);
    const shouldFetchDisplayNames = settings.displayNameLookup;
    const shouldFetchGuildData = guildId && settings.serverNickNameLookup;

    const skipUserIds = new Set(this.config.skipUserIds || []);
    const newlyFailedUserIds: string[] = [];

    let processedCount = 0;
    for (const userId of userIds) {
      if (await this.shouldStop()) break;

      // Skip users known to not exist (previously 404'd)
      if (skipUserIds.has(userId)) {
        processedCount++;
        continue;
      }

      const currentMapping = existingUserMap[userId] || updateMap[userId];
      const { userName, displayName, timestamp, guilds } = currentMapping;

      // Check if user display name needs fetching
      const needsDisplayName =
        shouldFetchDisplayNames &&
        ((!userName && !displayName) ||
          isUserDataStale(timestamp, settings.userDataRefreshRate));

      // Check if guild data needs fetching
      const needsGuildData =
        shouldFetchGuildData &&
        (!guilds[guildId] ||
          isUserDataStale(guilds[guildId]?.timestamp, settings.userDataRefreshRate));

      // Fetch display name if needed
      if (needsDisplayName) {
        this.config.onStatus?.(`Retrieving user alias for ${userName || userId}`);

        const { success, status, data } = await this.config.apiClient.getUser(
          this.config.token,
          userId,
        );

        if (success && data) {
          updateMap[userId] = {
            ...currentMapping,
            ...getUserMappingData(data),
          };
        } else {
          console.error(`Unable to retrieve data from userId: ${userId}`);
          // Only cache as permanently failed for 404 (user doesn't exist)
          // Other errors (403, 500) are transient and should be retried
          if (status === 404) {
            newlyFailedUserIds.push(userId);
          }
        }
      }

      // Fetch guild data if needed
      if (needsGuildData) {
        const updatedMapping = updateMap[userId];
        this.config.onStatus?.(
          `Retrieving server data for ${updatedMapping.userName || userId}`,
        );

        const { success, data } = await this.config.apiClient.fetchGuildUser(
          guildId,
          userId,
          this.config.token,
        );

        if (success && data) {
          updateMap[userId] = {
            ...updatedMapping,
            guilds: {
              ...updatedMapping.guilds,
              [guildId]: getGMOMappingData(data),
            },
          };
        } else {
          console.error(
            `Unable to retrieve guild user data from userId ${userId} and guildId ${guildId}`,
          );
          updateMap[userId] = {
            ...updatedMapping,
            guilds: {
              ...updatedMapping.guilds,
              [guildId]: defaultGMOMappingData,
            },
          };
        }
      }

      processedCount++;
      this.emitProgress(
        "enriching_user_data",
        processedCount,
        userIds.length,
        `Processing user ${processedCount}/${userIds.length}`,
      );
    }

    return {
      userMap: { ...existingUserMap, ...updateMap },
      failedUserIds: newlyFailedUserIds.length > 0 ? newlyFailedUserIds : undefined,
    };
  }

  private async shouldStop(): Promise<boolean> {
    if (this.config.shouldStop) return await this.config.shouldStop();
    return false;
  }

  private emitProgress(
    phase: ProgressPhase,
    current: number,
    total: number,
    message: string,
  ): void {
    this.config.onProgress?.({ phase, current, total, message });
  }
}