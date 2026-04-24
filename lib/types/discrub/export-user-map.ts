/**
 * This is a 'User Id -> User Information' map.
 */
export type ExportUserMap = {
  [id: string]: {
    userName: string | null | undefined;
    displayName: string | null | undefined;
    avatar: string | null | undefined;
    guilds: {
      [guildId: string]: {
        roles: string[];
        nick: string | null | undefined;
        joinedAt: string | null | undefined;
        timestamp: number;
      };
    };
    timestamp: number;
  };
};