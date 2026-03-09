import { env } from '../../../../config/index.js';
import { logger } from '../../../../utils/logger.js';
import { withRetry } from '../../../../utils/retry.js';
import { metrics } from '../../../../services/metrics/index.js';
import {
  GetPlayerSummariesResponse,
  GetOwnedGamesResponse,
  GetRecentlyPlayedGamesResponse,
  ResolveVanityURLResponse,
  PlayerSummary,
  OwnedGame,
  RecentlyPlayedGame,
  FormattedPlayerInfo,
  FormattedGameInfo,
  SteamResult,
  steamOk,
  steamErr,
} from './types.js';
import {
  parseSteamInput,
  formatPlaytime,
  getStatusText,
  getStatusIndicator,
  isProfilePublic,
  getGameIconUrl,
  getStoreUrl,
  getCountryFlag,
} from './utils.js';

const STEAM_API_BASE = 'https://api.steampowered.com';

class SteamApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'SteamApiError';
  }

  get isRetryable(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Steam API Client
 */
export class SteamClient {
  private apiKey: string;

  constructor() {
    this.apiKey = env.STEAM_API_KEY;
  }

  /**
   * Check if the Steam API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Make API request to Steam with automatic retry
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('STEAM_API_KEY is not configured');
    }

    const url = new URL(endpoint, STEAM_API_BASE);
    url.searchParams.set('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    logger.debug(
      `Steam API request: ${endpoint} (params: ${Object.keys(params).join(', ') || 'none'})`
    );

    return withRetry(
      async () => {
        metrics.incrementSteamCall();

        const response = await fetch(url.toString());

        if (!response.ok) {
          if (response.status >= 500) {
            metrics.incrementSteamError();
          }
          throw new SteamApiError(
            `Steam API error: ${response.status}`,
            response.status
          );
        }

        return response.json() as Promise<T>;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        operationName: `Steam API ${endpoint}`,
        shouldRetry: (error) => {
          if (error instanceof SteamApiError) {
            return error.isRetryable;
          }
          if (error instanceof TypeError) {
            // fetch throws TypeError on network failures
            return true;
          }
          return false;
        },
      }
    );
  }

  /**
   * Resolve vanity URL to Steam ID 64 (Result variant)
   */
  async resolveVanityURLResult(
    vanityName: string
  ): Promise<SteamResult<string>> {
    try {
      const data = await this.request<ResolveVanityURLResponse>(
        '/ISteamUser/ResolveVanityURL/v1/',
        { vanityurl: vanityName }
      );

      if (data.response.success === 1 && data.response.steamid) {
        return steamOk(data.response.steamid);
      }

      return steamErr('Vanity URL not found');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to resolve vanity URL:', msg);
      return steamErr(msg);
    }
  }

  /**
   * Resolve vanity URL to Steam ID 64
   */
  async resolveVanityURL(vanityName: string): Promise<string | null> {
    const result = await this.resolveVanityURLResult(vanityName);
    return result.ok ? result.data : null;
  }

  /**
   * Get Steam ID 64 from various input formats
   */
  async getSteamId64(input: string): Promise<string | null> {
    const parsed = parseSteamInput(input);

    if (parsed.type === 'steamid64') {
      return parsed.value;
    }

    return this.resolveVanityURL(parsed.value);
  }

  /**
   * Get player summary (Result variant)
   */
  async getPlayerSummaryResult(
    steamId: string
  ): Promise<SteamResult<PlayerSummary>> {
    try {
      const data = await this.request<GetPlayerSummariesResponse>(
        '/ISteamUser/GetPlayerSummaries/v2/',
        { steamids: steamId }
      );

      if (data.response.players.length > 0) {
        return steamOk(data.response.players[0]);
      }

      return steamErr('Player not found');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get player summary:', msg);
      return steamErr(msg);
    }
  }

  /**
   * Get player summary
   */
  async getPlayerSummary(steamId: string): Promise<PlayerSummary | null> {
    const result = await this.getPlayerSummaryResult(steamId);
    return result.ok ? result.data : null;
  }

  /**
   * Get owned games (Result variant)
   */
  async getOwnedGamesResult(
    steamId: string,
    includeAppInfo: boolean = true
  ): Promise<SteamResult<OwnedGame[]>> {
    try {
      const data = await this.request<GetOwnedGamesResponse>(
        '/IPlayerService/GetOwnedGames/v1/',
        {
          steamid: steamId,
          include_appinfo: includeAppInfo ? '1' : '0',
          include_played_free_games: '1',
        }
      );

      return steamOk(data.response.games ?? []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get owned games:', msg);
      return steamErr(msg);
    }
  }

  /**
   * Get owned games
   */
  async getOwnedGames(
    steamId: string,
    includeAppInfo: boolean = true
  ): Promise<OwnedGame[]> {
    const result = await this.getOwnedGamesResult(steamId, includeAppInfo);
    return result.ok ? result.data : [];
  }

  /**
   * Get recently played games (Result variant)
   */
  async getRecentlyPlayedGamesResult(
    steamId: string,
    count: number = 10
  ): Promise<SteamResult<RecentlyPlayedGame[]>> {
    try {
      const data = await this.request<GetRecentlyPlayedGamesResponse>(
        '/IPlayerService/GetRecentlyPlayedGames/v1/',
        {
          steamid: steamId,
          count: count.toString(),
        }
      );

      return steamOk(data.response.games ?? []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get recently played games:', msg);
      return steamErr(msg);
    }
  }

  /**
   * Get recently played games
   */
  async getRecentlyPlayedGames(
    steamId: string,
    count: number = 10
  ): Promise<RecentlyPlayedGame[]> {
    const result = await this.getRecentlyPlayedGamesResult(steamId, count);
    return result.ok ? result.data : [];
  }

  /**
   * Get formatted player info for display
   */
  async getFormattedPlayerInfo(
    input: string
  ): Promise<FormattedPlayerInfo | null> {
    const steamId = await this.getSteamId64(input);

    if (!steamId) {
      return null;
    }

    const player = await this.getPlayerSummary(steamId);

    if (!player) {
      return null;
    }

    const isPublic = isProfilePublic(player.communityvisibilitystate);

    return {
      steamId: player.steamid,
      name: player.personaname,
      profileUrl: player.profileurl,
      avatarUrl: player.avatarfull,
      status: getStatusText(player.personastate),
      statusEmoji: getStatusIndicator(player.personastate),
      isPublic,
      country: player.loccountrycode
        ? getCountryFlag(player.loccountrycode)
        : undefined,
      realName: player.realname,
      createdAt: player.timecreated
        ? new Date(player.timecreated * 1000)
        : undefined,
      currentGame: player.gameextrainfo,
    };
  }

  /**
   * Get formatted game list for display
   */
  async getFormattedGames(
    steamId: string,
    sortBy: 'playtime' | 'recent' | 'alphabetical' = 'playtime',
    limit: number = 10
  ): Promise<FormattedGameInfo[]> {
    const games = await this.getOwnedGames(steamId);

    if (games.length === 0) {
      return [];
    }

    // Sort games
    const sorted = [...games].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.name ?? '').localeCompare(b.name ?? '');
      }
      if (sortBy === 'recent') {
        return (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0);
      }
      return b.playtime_forever - a.playtime_forever;
    });

    // Take top N
    const topGames = sorted.slice(0, limit);

    return topGames.map((game) => ({
      appId: game.appid,
      name: game.name ?? `Unknown (${game.appid})`,
      playtimeForever: game.playtime_forever,
      playtimeForeverFormatted: formatPlaytime(game.playtime_forever),
      playtime2Weeks: game.playtime_2weeks,
      playtime2WeeksFormatted: game.playtime_2weeks
        ? formatPlaytime(game.playtime_2weeks)
        : undefined,
      iconUrl: getGameIconUrl(game.appid, game.img_icon_url ?? ''),
      storeUrl: getStoreUrl(game.appid),
    }));
  }

  /**
   * Get total playtime across all games
   */
  async getTotalPlaytime(steamId: string): Promise<number> {
    const games = await this.getOwnedGames(steamId, false);
    return games.reduce((total, game) => total + game.playtime_forever, 0);
  }

  /**
   * Search for a specific game by name
   */
  async findGameByName(
    steamId: string,
    gameName: string
  ): Promise<FormattedGameInfo | null> {
    const games = await this.getOwnedGames(steamId);
    const searchLower = gameName.toLowerCase();

    const found = games.find((game) =>
      game.name?.toLowerCase().includes(searchLower)
    );

    if (!found) {
      return null;
    }

    return {
      appId: found.appid,
      name: found.name ?? `Unknown (${found.appid})`,
      playtimeForever: found.playtime_forever,
      playtimeForeverFormatted: formatPlaytime(found.playtime_forever),
      playtime2Weeks: found.playtime_2weeks,
      playtime2WeeksFormatted: found.playtime_2weeks
        ? formatPlaytime(found.playtime_2weeks)
        : undefined,
      iconUrl: getGameIconUrl(found.appid, found.img_icon_url ?? ''),
      storeUrl: getStoreUrl(found.appid),
    };
  }
}

// Export singleton instance
export const steamClient = new SteamClient();
