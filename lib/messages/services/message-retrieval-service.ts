import type {
  MessageRetrievalResult,
  MessageRetrievalOptions,
  MessageFetchConfig,
} from "../types.ts";
import { MessageFetchService } from "./message-fetch-service.ts";
import { ReactionEnrichmentService } from "./reaction-enrichment-service.ts";
import { UserDataEnrichmentService } from "./user-enrichment-service.ts";

export class MessageRetrievalService {
  private fetchService: MessageFetchService;
  private reactionService: ReactionEnrichmentService;
  private userService: UserDataEnrichmentService;

  constructor(private config: MessageFetchConfig) {
    this.fetchService = new MessageFetchService(config);
    this.reactionService = new ReactionEnrichmentService(config);
    this.userService = new UserDataEnrichmentService(config);
  }

  /**
   * Main entry point - retrieves messages with full enrichment
   */
  async retrieveMessages(
    guildId: string | null,
    channelId: string | null,
    options: MessageRetrievalOptions = {},
  ): Promise<MessageRetrievalResult> {
    let result: MessageRetrievalResult = {
      messages: [],
      threads: [],
      userMap: this.config.existingUserMap || {},
      reactionMap: this.config.existingReactionMap || {},
    };

    // Step 1: Fetch messages
    const fetchResult = await this.fetchService.fetchMessages(
      guildId,
      channelId,
      options,
    );

    result.messages = fetchResult.messages;
    result.threads = fetchResult.threads;
    result.totalMessages = fetchResult.totalMessages;
    result.offset = fetchResult.offset;
    result.searchCriteria = fetchResult.searchCriteria;

    if (await this.shouldStop()) return result;

    // Step 2: Generate reaction map (if needed)
    const isReactionRemovalMode = !!this.config.settings.purgeReactionRemovalFrom;
    const reactionsEnabled = this.config.settings.reactionsEnabled;
    const requiresReactionMap =
      isReactionRemovalMode || (!options.excludeReactions && reactionsEnabled);

    if (requiresReactionMap && result.messages.length > 0) {
      const reactionResult = await this.reactionService.generateReactionMap(
        result.messages,
      );
      result.reactionMap = {
        ...result.reactionMap,
        ...reactionResult.reactionMap,
      };
    }

    if (await this.shouldStop()) return result;

    // Step 3: Enrich user data (if needed)
    if (!options.excludeUserLookups && result.messages.length > 0) {
      const userResult = await this.userService.enrichUserData(
        result.messages,
        guildId,
      );
      result.userMap = userResult.userMap;
    }

    // Emit completion
    this.config.onProgress?.({
      phase: "complete",
      current: 100,
      total: 100,
      message: "Message retrieval complete",
      data: result,
    });

    return result;
  }

  private async shouldStop(): Promise<boolean> {
    if (this.config.shouldStop) return await this.config.shouldStop();
    return false;
  }
}