import type {
  Message,
  Attachment,
  MessageModificationConfig,
  DeleteConfiguration,
} from "../types.ts";

/**
 * Service for modifying messages (edit, delete, etc.)
 */
export class MessageModificationService {
  private config: MessageModificationConfig;

  constructor(config: MessageModificationConfig) {
    this.config = config;
  }

  /**
   * Edit a single message
   */
  async editMessage(
    message: Message,
    updates: { content?: string; attachments?: Attachment[] },
  ): Promise<{ success: boolean; data?: Message }> {
    const { success, data } = await this.config.apiClient.editMessage(
      this.config.token,
      message.id,
      updates,
      message.channel_id,
    );

    return { success, data };
  }

  /**
   * Edit multiple messages with the same content
   */
  async editMessages(messages: Message[], updateText: string): Promise<void> {
    this.config.progressManager?.setIsModifying(true);
    let noPermissionThreadIds: string[] = [];

    for (const message of messages) {
      if (await this.config.shouldStop?.()) break;

      // Handle thread restrictions
      if (this.config.threadManager) {
        noPermissionThreadIds = await this.config.threadManager.liftThreadRestrictions(
          message.channel_id,
          noPermissionThreadIds,
        );
      }

      this.config.progressManager?.setModifyEntity(message);

      const isMissingPermission = noPermissionThreadIds.some(
        (tId) => tId === message.channel_id,
      );

      if (isMissingPermission) {
        await this.config.notificationManager?.notify(
          "Permission missing for message, skipping edit",
          1,
        );
      } else {
        const { success } = await this.editMessage(message, {
          content: updateText,
        });

        if (!success) {
          await this.config.notificationManager?.notify(
            "You do not have permission to modify this message!",
            2,
          );
        }
      }
    }

    this.config.progressManager?.setIsModifying(false);
  }

  /**
   * Delete a single message
   */
  async deleteMessage(message: Message): Promise<boolean> {
    const { success } = await this.config.apiClient.deleteMessage(
      this.config.token,
      message.id,
      message.channel_id,
    );

    return success;
  }

  /**
   * Delete multiple messages based on configuration
   */
  async deleteMessages(
    messages: Message[],
    deleteConfig: DeleteConfiguration,
  ): Promise<void> {
    this.config.progressManager?.setIsModifying(true);
    let noPermissionThreadIds: string[] = [];

    // Check if operation can end early
    const canEndEarly =
      deleteConfig.reactions && !messages.some((m) => m.reactions?.length);
    if (canEndEarly) {
      this.config.progressManager?.setIsModifying(false);
      return;
    }

    for (const [count, currentRow] of messages.entries()) {
      if (await this.config.shouldStop?.()) break;

      // Handle thread restrictions
      if (this.config.threadManager) {
        noPermissionThreadIds = await this.config.threadManager.liftThreadRestrictions(
          currentRow.channel_id,
          noPermissionThreadIds,
        );
      }

      this.config.progressManager?.setModifyEntity({
        ...currentRow,
        _index: count + 1,
        _total: messages.length,
      });

      const isMissingPermission = noPermissionThreadIds.some(
        (tId) => tId === currentRow.channel_id,
      );

      if (isMissingPermission) {
        await this.config.notificationManager?.notify(
          "You do not have permission to modify content in this location, skipping",
          1,
        );
      } else {
        await this.processMessageDeletion(currentRow, deleteConfig);
      }
    }

    this.config.progressManager?.setIsModifying(false);
  }

  /**
   * Delete an attachment from a message
   */
  async deleteAttachment(
    message: Message,
    attachment: Attachment,
  ): Promise<{ success: boolean; shouldDeleteMessage: boolean }> {
    const shouldEdit =
      (message.content && message.content.length > 0) ||
      message.attachments.length > 1;

    if (shouldEdit) {
      const updatedMessage = {
        ...message,
        attachments: message.attachments.filter(
          (attch) => attch.id !== attachment.id,
        ),
      };
      const { success } = await this.editMessage(updatedMessage, {
        attachments: updatedMessage.attachments,
      });
      return { success, shouldDeleteMessage: false };
    } else {
      const success = await this.deleteMessage(message);
      return { success, shouldDeleteMessage: true };
    }
  }

  /**
   * Process deletion of a single message based on configuration
   */
  private async processMessageDeletion(
    message: Message,
    deleteConfig: DeleteConfiguration,
  ): Promise<void> {
    const shouldDelete = this.shouldDeleteMessage(message, deleteConfig);
    const shouldEdit = this.shouldEditMessage(deleteConfig);
    const shouldUnReact = this.shouldRemoveReactions(deleteConfig);

    if (shouldDelete) {
      if (await this.config.shouldStop?.()) return;
      const success = await this.deleteMessage(message);

      if (!success) {
        await this.config.notificationManager?.notify(
          "You do not have permission to modify this message!",
          2,
        );
      }
    } else if (shouldEdit) {
      if (await this.config.shouldStop?.()) return;
      const success = await this.editMessage(message, {
        ...(deleteConfig.attachments ? { attachments: [] } : { content: "" }),
      });

      if (!success) {
        await this.config.notificationManager?.notify(
          "You do not have permission to modify this message!",
          2,
        );
      }
    } else if (shouldUnReact) {
      if (await this.config.shouldStop?.()) return;
      await this.processReactionRemoval(message, deleteConfig);
    }
  }

  /**
   * Process reaction removal for a message
   */
  private async processReactionRemoval(
    message: Message,
    deleteConfig: DeleteConfiguration,
  ): Promise<void> {
    const reactionMapping = this.config.existingReactionMap?.[message.id] || {};

    for (const userId of deleteConfig.reactingUserIds) {
      for (const emoji of deleteConfig.emojis) {
        if (await this.config.shouldStop?.()) break;

        const foundReaction = reactionMapping[emoji]?.find(
          (er) => er.id === userId,
        );

        if (foundReaction) {
          const userMapping = this.config.existingUserMap?.[userId];
          this.config.progressManager?.setModifyEntity({
            ...message,
            _data1: userId,
            _data2: emoji,
          });

          const { success } = await this.config.apiClient.deleteReaction(
            this.config.token,
            message.channel_id,
            message.id,
            emoji,
            userId,
          );

          if (!success) {
            await this.config.notificationManager?.notify(
              `Unable to remove reaction from ${userMapping?.userName || userId}`,
              2,
            );
          }
        }
      }
    }
  }

  /**
   * Check if message should be completely deleted
   */
  private shouldDeleteMessage(
    message: Message,
    deleteConfig: DeleteConfiguration,
  ): boolean {
    return (
      this.isRemovableMessage(message) &&
      ((deleteConfig.attachments && deleteConfig.messages) ||
        (message.content.length === 0 && deleteConfig.attachments) ||
        (message.attachments.length === 0 && deleteConfig.messages))
    );
  }

  /**
   * Check if message should be edited
   */
  private shouldEditMessage(deleteConfig: DeleteConfiguration): boolean {
    return deleteConfig.attachments || deleteConfig.messages;
  }

  /**
   * Check if reactions should be removed
   */
  private shouldRemoveReactions(deleteConfig: DeleteConfiguration): boolean {
    return (
      deleteConfig.reactions &&
      deleteConfig.reactingUserIds.length > 0 &&
      deleteConfig.emojis.length > 0
    );
  }

  /**
   * Check if message can be removed (not a system message)
   */
  private isRemovableMessage(message: Message): boolean {
    // System messages (type !== 0 and !== 19) cannot be deleted
    // Type 0 = DEFAULT, Type 19 = REPLY
    return message.type === 0 || message.type === 19;
  }
}
