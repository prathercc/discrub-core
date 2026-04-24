import { DiscordService } from "../../services/discord-service.ts";
import type { IDiscordAPIClient, APIResponse, SearchResultData } from "../types.ts";
import type { AppSettings, SearchCriteria } from "../../types/discrub-types.ts";
import type { Message, User, GuildMemberObject, Attachment } from "../../types/discord-types.ts";
import { QueryStringParam, ReactionType } from "../../enum/discord-enum.ts";

/**
 * Adapter to make DiscordService compatible with IDiscordAPIClient interface
 */
export class DiscordServiceAdapter implements IDiscordAPIClient {
  private service: DiscordService;

  constructor(settings: AppSettings) {
    this.service = new DiscordService(settings);
  }

  async fetchMessageData(
    token: string,
    lastId: string,
    channelId: string,
    param?: string,
  ): Promise<APIResponse<Message[]>> {
    const queryParam = param === "around" ? QueryStringParam.AROUND : undefined;
    return this.service.fetchMessageData(token, lastId, channelId, queryParam);
  }

  async fetchSearchMessageData(
    token: string,
    offset: number,
    channelId: string | null,
    guildId: string | null,
    criteria: SearchCriteria,
  ): Promise<APIResponse<SearchResultData>> {
    const result = await this.service.fetchSearchMessageData(
      token,
      offset,
      channelId,
      guildId,
      criteria,
    );

    // Transform SearchMessageResult to SearchResultData
    // The service returns messages as Message[], but we expect Message[][]
    if (result.success && result.data) {
      return {
        success: true,
        status: result.status,
        data: {
          total_results: result.data.total_results,
          messages: [result.data.messages], // Wrap in array
          threads: result.data.threads,
        },
      };
    }

    return result as APIResponse<SearchResultData>;
  }

  async getReactions(
    token: string,
    channelId: string,
    messageId: string,
    emoji: string,
    type: number,
    lastId: string | null,
  ): Promise<APIResponse<User[]>> {
    const reactionType = type === 0 ? ReactionType.NORMAL : ReactionType.BURST;
    return this.service.getReactions(
      token,
      channelId,
      messageId,
      emoji,
      reactionType,
      lastId,
    );
  }

  async getUser(token: string, userId: string): Promise<APIResponse<User>> {
    return this.service.getUser(token, userId);
  }

  async fetchGuildUser(
    guildId: string,
    userId: string,
    token: string,
  ): Promise<APIResponse<GuildMemberObject>> {
    return this.service.fetchGuildUser(guildId, userId, token);
  }

  async editMessage(
    token: string,
    messageId: string,
    data: { content?: string; attachments?: Attachment[] },
    channelId: string,
  ): Promise<APIResponse<Message>> {
    return this.service.editMessage(token, messageId, data, channelId);
  }

  async deleteMessage(
    token: string,
    messageId: string,
    channelId: string,
  ): Promise<APIResponse<void>> {
    return this.service.deleteMessage(token, messageId, channelId);
  }

  async deleteReaction(
    token: string,
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<APIResponse<void>> {
    return this.service.deleteReaction(token, channelId, messageId, emoji, userId);
  }
}