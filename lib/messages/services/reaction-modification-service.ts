import type { ReactionModificationConfig } from "../types.ts";

/**
 * Service for modifying reactions
 */
export class ReactionModificationService {
  private config: ReactionModificationConfig;

  constructor(config: ReactionModificationConfig) {
    this.config = config;
  }

  /**
   * Delete a reaction from a message
   */
  async deleteReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<boolean> {
    // Lift thread restrictions if manager is available
    if (this.config.threadManager) {
      await this.config.threadManager.liftThreadRestrictions(channelId, []);
    }

    // Use @me if deleting current user's reaction
    const userIdParam =
      userId === this.config.currentUserId ? "@me" : userId;

    const { success } = await this.config.apiClient.deleteReaction(
      this.config.token,
      channelId,
      messageId,
      emoji,
      userIdParam,
    );

    return success;
  }
}
