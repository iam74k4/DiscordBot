import { database } from '../../../infrastructure/database/connection.js';
import { logger } from '../../../shared/utils/logger.js';

export interface SteamUserRecord {
  discord_id: string;
  steam_id: string;
  steam_name: string | null;
  registered_at: number;
}

const SQLITE_MAX_PARAMS = 900;

function register(
  discordId: string,
  steamId: string,
  steamName?: string
): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO steam_users (discord_id, steam_id, steam_name, registered_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(discordId, steamId, steamName ?? null, Date.now());
  logger.debug(`Registered Steam user: ${discordId} -> ${steamId}`);
}

function unregister(discordId: string): boolean {
  const stmt = database.prepare('DELETE FROM steam_users WHERE discord_id = ?');
  const result = stmt.run(discordId);
  logger.debug(`Unregistered Steam user: ${discordId}`);
  return result.changes > 0;
}

function getByDiscordId(discordId: string): SteamUserRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM steam_users WHERE discord_id = ?'
  );
  const result = stmt.get(discordId) as SteamUserRecord | undefined;
  return result ?? null;
}

function getSteamId(discordId: string): string | null {
  const user = getByDiscordId(discordId);
  return user?.steam_id ?? null;
}

function hasRegistered(discordId: string): boolean {
  const stmt = database.prepare(
    'SELECT 1 FROM steam_users WHERE discord_id = ? LIMIT 1'
  );
  return stmt.get(discordId) !== undefined;
}

function getAll(): SteamUserRecord[] {
  const stmt = database.prepare('SELECT * FROM steam_users');
  return stmt.all() as SteamUserRecord[];
}

function getByDiscordIds(discordIds: string[]): SteamUserRecord[] {
  if (discordIds.length === 0) return [];

  const uniqueIds = [...new Set(discordIds)];

  if (uniqueIds.length <= SQLITE_MAX_PARAMS) {
    const placeholders = uniqueIds.map(() => '?').join(',');
    const stmt = database.prepare(
      `SELECT * FROM steam_users WHERE discord_id IN (${placeholders})`
    );
    return stmt.all(...uniqueIds) as SteamUserRecord[];
  }

  const results: SteamUserRecord[] = [];
  for (let i = 0; i < uniqueIds.length; i += SQLITE_MAX_PARAMS) {
    const chunk = uniqueIds.slice(i, i + SQLITE_MAX_PARAMS);
    const placeholders = chunk.map(() => '?').join(',');
    const stmt = database.prepare(
      `SELECT * FROM steam_users WHERE discord_id IN (${placeholders})`
    );
    const chunkResults = stmt.all(...chunk) as SteamUserRecord[];
    results.push(...chunkResults);
  }
  return results;
}

function getCount(): number {
  const stmt = database.prepare('SELECT COUNT(*) as count FROM steam_users');
  const result = stmt.get() as { count: number };
  return result.count;
}

export const steamUserRepository = {
  getAll,
  getByDiscordId,
  getSteamId,
  getByDiscordIds,
  getCount,
  hasRegistered,
  register,
  unregister,
};
