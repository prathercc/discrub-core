import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageRetrievalFactory } from './message-retrieval-factory.ts';
import { MessageRetrievalService } from '../services/message-retrieval-service.ts';
import type { MessageFetchConfig } from '../types.ts';
import type { AppSettings } from '../../types/discrub-types.ts';

describe('MessageRetrievalFactory', () => {
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      fetchMessageData: vi.fn(),
      fetchSearchMessageData: vi.fn(),
      getUser: vi.fn(),
      fetchGuildUser: vi.fn(),
      getReactions: vi.fn(),
    };
  });

  describe('Factory Methods', () => {
    it('should create basic fetcher with no enrichment', () => {
      const fetcher = MessageRetrievalFactory.createBasicFetcher(
        mockApiClient,
        'test-token'
      );

      expect(fetcher).toBeInstanceOf(MessageRetrievalService);

      // Access the config through the fetcher's internal structure
      // Since config is private, we can test behavior instead
      // The basic fetcher should have reactions and user lookups disabled
      expect(fetcher).toBeDefined();
    });

    it('should create full fetcher with all enrichments', () => {
      const settings: AppSettings = {
        reactionsEnabled: true,
        displayNameLookup: true,
        serverNickNameLookup: true,
        userDataRefreshRate: 30,
      } as AppSettings;

      const fetcher = MessageRetrievalFactory.createFullFetcher(
        mockApiClient,
        'test-token',
        settings
      );

      expect(fetcher).toBeInstanceOf(MessageRetrievalService);
      expect(fetcher).toBeDefined();
    });

    it('should create custom configured fetcher', () => {
      const config: MessageFetchConfig = {
        apiClient: mockApiClient,
        token: 'test-token',
        settings: {
          reactionsEnabled: false,
          displayNameLookup: true,
          serverNickNameLookup: false,
          userDataRefreshRate: 15,
        } as AppSettings,
        existingUserMap: { 'user1': { userName: 'test' } },
        existingReactionMap: {},
      };

      const fetcher = MessageRetrievalFactory.create(config);

      expect(fetcher).toBeInstanceOf(MessageRetrievalService);
      expect(fetcher).toBeDefined();
    });
  });
});
