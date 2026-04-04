/**
 * Steam API Response Types
 */

/**
 * Result type for Steam API operations that can fail.
 * Use `ok` to check success, access `data` on success, `error` on failure.
 */
export type SteamResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function steamOk<T>(data: T): SteamResult<T> {
  return { ok: true, data };
}

export function steamErr<T>(error: string): SteamResult<T> {
  return { ok: false, error };
}

/**
 * Player online status
 */
export enum PersonaState {
  Offline = 0,
  Online = 1,
  Busy = 2,
  Away = 3,
  Snooze = 4,
  LookingToTrade = 5,
  LookingToPlay = 6,
}

/**
 * Profile visibility level
 */
export enum CommunityVisibilityState {
  Private = 1,
  FriendsOnly = 2,
  Public = 3,
}

/**
 * Player summary from GetPlayerSummaries
 */
export interface PlayerSummary {
  steamid: string;
  communityvisibilitystate: CommunityVisibilityState;
  profilestate?: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  lastlogoff?: number;
  personastate: PersonaState;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  personastateflags?: number;
  loccountrycode?: string;
  locstatecode?: string;
  loccityid?: number;
  gameextrainfo?: string;
  gameid?: string;
}

/**
 * GetPlayerSummaries API response
 */
export interface GetPlayerSummariesResponse {
  response: {
    players: PlayerSummary[];
  };
}

/**
 * Game info from GetOwnedGames
 */
export interface OwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  rtime_last_played?: number;
}

/**
 * GetOwnedGames API response
 */
export interface GetOwnedGamesResponse {
  response: {
    game_count?: number;
    games?: OwnedGame[];
  };
}

/**
 * Recently played game
 */
export interface RecentlyPlayedGame {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
  img_icon_url: string;
}

/**
 * GetRecentlyPlayedGames API response
 */
export interface GetRecentlyPlayedGamesResponse {
  response: {
    total_count: number;
    games?: RecentlyPlayedGame[];
  };
}

/**
 * ResolveVanityURL API response
 */
export interface ResolveVanityURLResponse {
  response: {
    steamid?: string;
    success: number;
    message?: string;
  };
}

/**
 * Formatted player info for display
 */
export interface FormattedPlayerInfo {
  steamId: string;
  name: string;
  profileUrl: string;
  avatarUrl: string;
  status: string;
  statusEmoji: string;
  isPublic: boolean;
  country?: string;
  realName?: string;
  createdAt?: Date;
  currentGame?: string;
}

/**
 * Formatted game info for display
 */
export interface FormattedGameInfo {
  appId: number;
  name: string;
  playtimeForever: number;
  playtimeForeverFormatted: string;
  playtime2Weeks?: number;
  playtime2WeeksFormatted?: string;
  iconUrl: string;
  storeUrl: string;
}
