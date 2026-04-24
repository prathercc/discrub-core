import type { PurgeConfig, Message } from "../types.ts";
import { MessageModificationService } from "./message-modification-service.ts";
import { ReactionModificationService } from "./reaction-modification-service.ts";
import { PurgeStatus } from "../../enum/discrub-enum.ts";

/**
 * Service for purging messages with advanced options
 */
export class PurgeService {
  private config: PurgeConfig;
  private messageService: MessageModificationService;
  private reactionService: ReactionModificationService;

  constructor(config: PurgeConfig) {
    this.config = config;

    this.messageService = new MessageModificationService({
      apiClient: config.apiClient,
      token: config.token,
      threadManager: config.threadManager,
    });

    this.reactionService = new ReactionModificationService({
      apiClient: config.apiClient,
      token: config.token,
      threadManager: config.threadManager,
      currentUserId: config.currentUserId,
    });
  }

  /**
   * Process messages for purging based on configuration
   */
  async processMessages(
    messages: Message[],
    skipThreadIds: string[],
    skipMessageIds: string[],
    totalMessages?: number,
  ): Promise<{
    skipThreadIds: string[];
    processedCount: number;
    removedCount: number;
  }> {
    const filteredMessages = messages.filter(
      (m) => !skipMessageIds.some((id) => id === m.id),
    );

    let processedCount = 0;
    let removedCount = 0;
    let currentSkipThreadIds = [...skipThreadIds];

    for (const [index, message] of filteredMessages.entries()) {
      // Check if should stop
      if (this.config.shouldStop && (await this.config.shouldStop())) {
        break;
      }

      // Lift thread restrictions if manager is available
      if (this.config.threadManager) {
        const restrictedIds =
          await this.config.threadManager.liftThreadRestrictions(
            message.channel_id,
            currentSkipThreadIds,
          );
        currentSkipThreadIds = [...new Set([...currentSkipThreadIds, ...restrictedIds])];
      }

      let status = PurgeStatus.IN_PROGRESS;

      // Update progress
      if (this.config.progressManager) {
        this.config.progressManager.setModifyEntity({
          ...message,
          _index: index + 1,
          _total: totalMessages ? Number(totalMessages) - index : undefined,
          _status: status,
        });
      }

      // Check if missing permission
      const isMissingPermission = currentSkipThreadIds.some(
        (id) => id === message.channel_id,
      );

      if (isMissingPermission) {
        status = PurgeStatus.MISSING_PERMISSION;
      } else {
        const { retainAttachedMedia, reactionRemovalFrom } =
          this.config.settings;
        const isReactionRemoval = !!reactionRemovalFrom.length;
        const isRetainedAttachment =
          retainAttachedMedia && message?.attachments?.length;

        if (isReactionRemoval) {
          status = await this.removeMessageReactions(message);
        } else if (isRetainedAttachment) {
          status = await this.retainAttachmentMessage(message);
          if (status === PurgeStatus.ATTACHMENTS_KEPT) {
            removedCount++;
          }
        } else if (this.isRemovableMessage(message)) {
          const success = await this.messageService.deleteMessage(message);
          status = success
            ? PurgeStatus.REMOVED
            : PurgeStatus.MISSING_PERMISSION;
          if (success) {
            removedCount++;
          }
        } else {
          status = PurgeStatus.MESSAGE_NON_REMOVABLE;
        }
      }

      processedCount++;

      // Update final status
      if (this.config.progressManager) {
        this.config.progressManager.setModifyEntity({
          ...message,
          _index: index + 1,
          _total: totalMessages ? Number(totalMessages) - index : undefined,
          _status: status,
        });
      }
    }

    return {
      skipThreadIds: currentSkipThreadIds,
      processedCount,
      removedCount,
    };
  }

  /**
   * Remove reactions from a message
   */
  private async removeMessageReactions(message: Message): Promise<PurgeStatus> {
    const { reactionRemovalFrom } = this.config.settings;
    const reactionMap = this.config.existingReactionMap || {};

    const msgReactionMap = reactionMap[message.id] || {};
    let total = 0;
    let succeeded = 0;

    for (const emoji of Object.keys(msgReactionMap)) {
      const undoReactions = msgReactionMap[emoji].filter((e) =>
        reactionRemovalFrom.some((id) => id === e.id),
      );

      for (const reaction of undoReactions) {
        const success = await this.reactionService.deleteReaction(
          message.channel_id,
          message.id,
          emoji,
          reaction.id,
        );
        total += 1;
        if (success) {
          succeeded += 1;
        }
      }
    }

    // Determine result status
    if (total === 0) {
      return PurgeStatus.NO_REACTIONS_FOUND;
    } else if (succeeded === total) {
      return PurgeStatus.REACTIONS_REMOVED;
    } else if (succeeded > 0 && succeeded < total) {
      return PurgeStatus.REACTIONS_PARTIALLY_REMOVED;
    } else {
      return PurgeStatus.MISSING_PERMISSION;
    }
  }

  /**
   * Retain message attachments by clearing text only
   */
  private async retainAttachmentMessage(
    message: Message,
  ): Promise<PurgeStatus> {
    if (message.content.length) {
      const { success } = await this.messageService.editMessage(
        { ...message, content: "" },
        { content: "", attachments: message.attachments },
      );
      return success
        ? PurgeStatus.ATTACHMENTS_KEPT
        : PurgeStatus.MISSING_PERMISSION;
    }
    return PurgeStatus.ATTACHMENTS_KEPT;
  }

  /**
   * Check if message is removable
   */
  private isRemovableMessage(message: Message): boolean {
    // A message is removable if it's not a system message
    // System messages have type > 0
    return message.type === 0;
  }
}
