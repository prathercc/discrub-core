export type DiscordApiResponse<T = void> = {
  success: boolean;
  status?: number;
  data?: T;
};