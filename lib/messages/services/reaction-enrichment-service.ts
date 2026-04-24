import type {
  Message,
  User,
  ExportReaction,
  ReactionEnrichmentConfig,
  ReactionEnrichmentResult,
  ProgressPhase,
} from "../types.ts";
import type { ExportReactionMap } from "../../types/discrub-types.ts";
import type { Reaction } from "../../types/discord-types.ts";
import { PaginationHelper } from "../pagination.ts";
import { getEncodedEmoji } from "../utils.ts";

const REACTION_TYPE_NORMAL = 0;
const REACTION_TYPE_BURST = 1;

export class ReactionEnrichmentService {
  private paginationHelper: PaginationHelper;

  constructor(private config: ReactionEnrichmentConfig) {
    this.paginationHelper = new PaginationHelper(config);
  }

  /**
   * Generates a complete reaction map for messages
   * Maps message IDs -> emoji -> users who reacted
   */
  async generateReactionMap(messages: Message[]): Promise<ReactionEnrichmentResult> {
    const reactionMap: ExportReactionMap = {};
    const filteredMessages = messages.filter((m) => !!m.reactions?.length);

    for (const [mI, message] of filteredMessages.entries()) {
      reactionMap[message.id] = {};

      if (await this.shouldStop()) break;

      if (message.reactions?.length) {
        for (const reaction of message.reactions) {
          const { emoji } = reaction;
          const encodedEmoji = getEncodedEmoji(emoji);

          this.config.onStatus?.(
            `Retrieving reaction users for ${emoji.name || "unknown"} (${mI + 1}/${filteredMessages.length}) ${!!emoji.id ? "[custom]" : ""}`,
          );

          if ((await this.shouldStop()) || !encodedEmoji) break;

          reactionMap[message.id][encodedEmoji] = await this.fetchReactingUserIds(
            message,
            encodedEmoji,
            reaction,
          );

          this.emitProgress(
            "generating_reaction_map",
            mI + 1,
            filteredMessages.length,
            `Processing reactions for message ${mI + 1}`,
          );
        }
      }
    }

    return {
      messages,
      reactionMap,
    };
  }

  /**
   * Fetches all users who reacted with a specific emoji.
   * Uses count_details to skip normal/burst fetch when count is 0.
   */
  private async fetchReactingUserIds(
    message: Message,
    encodedEmoji: string,
    reaction: Reaction,
  ): Promise<ExportReaction[]> {
    const exportReactions: ExportReaction[] = [];
    const normalCount = reaction.count_details?.normal ?? reaction.count ?? 0;
    const burstCount = reaction.count_details?.burst ?? 0;

    for (const type of [REACTION_TYPE_NORMAL, REACTION_TYPE_BURST]) {
      const isBurst = type === REACTION_TYPE_BURST;

      // Skip API call when count_details confirms 0 reactions of this type
      if (isBurst && burstCount === 0) continue;
      if (!isBurst && normalCount === 0) continue;

      const users = await this.paginationHelper.paginatedFetch<User>(
        (lastId) =>
          this.config.apiClient.getReactions(
            this.config.token,
            message.channel_id,
            message.id,
            encodedEmoji,
            type,
            lastId,
          ),
      );

      users.forEach((u) => {
        exportReactions.push({
          id: u.id,
          burst: isBurst,
          username: u.username,
          avatar: u.avatar,
        });
      });
    }

    return exportReactions;
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