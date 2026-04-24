import type {
  Message,
  Channel,
  User,
  GuildMemberObject,
  Reaction,
  Attachment,
} from "../types/discord-types.ts";
import type {
  SearchCriteria,
  ExportUserMap,
  ExportReactionMap,
  ExportReaction,
} from "../types/discrub-types.ts";

// ============================================================================
// API Client Interface (allows any Discord API wrapper)
// ============================================================================

export interface IDiscordAPIClient {
  // Fetching methods
  fetchMessageData(
    token: string,
    lastId: string,
    channelId: string,
    param?: string,
  ): Promise<APIResponse<Message[]>>;

  fetchSearchMessageData(
    token: string,
    offset: number,
    channelId: string | null,
    guildId: string | null,
    criteria: SearchCriteria,
  ): Promise<APIResponse<SearchResultData>>;

  getReactions(
    token: string,
    channelId: string,
    messageId: string,
    emoji: string,
    type: number,
    lastId: string | null,
  ): Promise<APIResponse<User[]>>;

  getUser(token: string, userId: string): Promise<APIResponse<User>>;

  fetchGuildUser(
    guildId: string,
    userId: string,
    token: string,
  ): Promise<APIResponse<GuildMemberObject>>;

  // Modification methods
  editMessage(
    token: string,
    messageId: string,
    data: { content?: string; attachments?: Attachment[] },
    channelId: string,
  ): Promise<APIResponse<Message>>;

  deleteMessage(
    token: string,
    messageId: string,
    channelId: string,
  ): Promise<APIResponse<void>>;

  deleteReaction(
    token: string,
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<APIResponse<void>>;
}

export interface APIResponse<T> {
  success: boolean;
  status?: number;
  data?: T;
}

export interface SearchResultData {
  total_results: number;
  messages: Message[][];
  threads: Channel[];
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface MessageRetrievalSettings {
  reactionsEnabled: boolean;
  displayNameLookup: boolean;
  serverNickNameLookup: boolean;
  userDataRefreshRate: number;
  purgeReactionRemovalFrom?: string;
}

export interface MessageRetrievalOptions {
  searchCriteria?: SearchCriteria;
  excludeReactions?: boolean;
  excludeUserLookups?: boolean;
  startOffset?: number;
  endOffset?: number;
}

export interface DeleteConfiguration {
  attachments: boolean;
  messages: boolean;
  reactions: boolean;
  reactingUserIds: string[];
  emojis: string[];
}

// ============================================================================
// Progress & Cancellation
// ============================================================================

export type ProgressPhase =
  | "fetching_messages"
  | "fetching_threads"
  | "resolving_reactions"
  | "generating_reaction_map"
  | "enriching_user_data"
  | "complete";

export interface ProgressUpdate {
  phase: ProgressPhase;
  current: number;
  total: number;
  message: string;
  data?: Partial<MessageRetrievalResult>;
}

export type ProgressCallback = (progress: ProgressUpdate) => void;
export type StatusCallback = (status: string) => void;
export type ShouldStopCallback = () => boolean | Promise<boolean>;

// ============================================================================
// Data Provider Interfaces (for channel/thread lookups)
// ============================================================================

export interface IChannelProvider {
  findChannel(channelId: string): Channel | undefined;
  getChannels(): Channel[];
  getDMs(): Channel[];
}

export interface IThreadProvider {
  fetchArchivedThreads(
    channelId: string,
    knownThreads: Channel[],
  ): Promise<Channel[]>;
}

export interface IThreadManager {
  liftThreadRestrictions(
    channelId: string,
    knownNoPermissionIds: string[],
  ): Promise<string[]>;
}

export interface INotificationManager {
  notify(message: string, timeout: number): Promise<void>;
}

export interface IModificationProgressManager {
  setIsModifying(isModifying: boolean): void;
  setModifyEntity(entity: any): void;
}

// ============================================================================
// Result Types
// ============================================================================

export interface MessageRetrievalResult {
  messages: Message[];
  threads: Channel[];
  userMap: ExportUserMap;
  reactionMap: ExportReactionMap;
  totalMessages?: number;
  offset?: number;
  searchCriteria?: SearchCriteria;
}

export interface MessageFetchResult {
  messages: Message[];
  threads: Channel[];
  totalMessages?: number;
  offset?: number;
  searchCriteria?: SearchCriteria;
}

export interface ReactionEnrichmentResult {
  messages: Message[];
  reactionMap: ExportReactionMap;
}

export interface UserEnrichmentResult {
  userMap: ExportUserMap;
  /** User IDs that failed lookup during this enrichment run */
  failedUserIds?: string[];
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface BaseServiceConfig {
  apiClient: IDiscordAPIClient;
  token: string;
  onProgress?: ProgressCallback;
  onStatus?: StatusCallback;
  shouldStop?: ShouldStopCallback;
}

export interface MessageFetchConfig extends BaseServiceConfig {
  settings: MessageRetrievalSettings;
  channelProvider?: IChannelProvider;
  threadProvider?: IThreadProvider;
  existingUserMap?: ExportUserMap;
  existingReactionMap?: ExportReactionMap;
}

export interface ReactionEnrichmentConfig extends BaseServiceConfig {
  settings: MessageRetrievalSettings;
}

export interface UserEnrichmentConfig extends BaseServiceConfig {
  settings: MessageRetrievalSettings;
  existingUserMap?: ExportUserMap;
  existingReactionMap?: ExportReactionMap;
  /** User IDs to skip during enrichment (e.g., previously 404'd) */
  skipUserIds?: string[];
}

export interface MessageModificationConfig {
  apiClient: IDiscordAPIClient;
  token: string;
  threadManager?: IThreadManager;
  notificationManager?: INotificationManager;
  progressManager?: IModificationProgressManager;
  shouldStop?: ShouldStopCallback;
  currentUserId?: string;
  existingReactionMap?: ExportReactionMap;
  existingUserMap?: ExportUserMap;
}

export interface ReactionModificationConfig {
  apiClient: IDiscordAPIClient;
  token: string;
  threadManager?: IThreadManager;
  notificationManager?: INotificationManager;
  shouldStop?: ShouldStopCallback;
  currentUserId?: string;
}

// ============================================================================
// Purge Configuration & Options
// ============================================================================

export interface PurgeConfig {
  apiClient: IDiscordAPIClient;
  token: string;
  threadManager?: IThreadManager;
  progressManager?: IModificationProgressManager;
  shouldStop?: ShouldStopCallback;
  currentUserId?: string;
  existingReactionMap?: ExportReactionMap;
  settings: PurgeSettings;
}

export interface PurgeSettings {
  retainAttachedMedia: boolean;
  reactionRemovalFrom: string[];
}

export interface PurgeOptions {
  searchCriteria: SearchCriteria;
  excludeReactions?: boolean;
  excludeUserLookups?: boolean;
}

export interface PurgeResult {
  messagesProcessed: number;
  messagesRemoved: number;
  messagesFailed: number;
  reactionsRemoved: number;
}

// Re-export commonly used types
export type {
  Message,
  Channel,
  User,
  GuildMemberObject,
  Reaction,
  Attachment,
  ExportReaction,
  SearchCriteria,
  ExportUserMap,
  ExportReactionMap,
};