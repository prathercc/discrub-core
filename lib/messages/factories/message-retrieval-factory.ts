import { MessageRetrievalService } from "../services/message-retrieval-service.ts";
import type {
  IDiscordAPIClient,
  MessageFetchConfig,
  MessageRetrievalSettings,
} from "../types.ts";

export class MessageRetrievalFactory {
  /**
   * Create a basic fetcher (messages only, no reactions/user enrichment)
   */
  static createBasicFetcher(
    apiClient: IDiscordAPIClient,
    token: string,
  ): MessageRetrievalService {
    const config: MessageFetchConfig = {
      apiClient,
      token,
      settings: {
        reactionsEnabled: false,
        displayNameLookup: false,
        serverNickNameLookup: false,
        userDataRefreshRate: 0,
      },
    };

    return new MessageRetrievalService(config);
  }

  /**
   * Create a full-featured fetcher (messages + reactions + user data)
   */
  static createFullFetcher(
    apiClient: IDiscordAPIClient,
    token: string,
    settings: MessageRetrievalSettings,
    options?: Partial<MessageFetchConfig>,
  ): MessageRetrievalService {
    const config: MessageFetchConfig = {
      apiClient,
      token,
      settings,
      ...options,
    };

    return new MessageRetrievalService(config);
  }

  /**
   * Create a fetcher with custom configuration
   */
  static create(config: MessageFetchConfig): MessageRetrievalService {
    return new MessageRetrievalService(config);
  }
}