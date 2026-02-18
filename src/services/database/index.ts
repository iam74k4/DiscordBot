import Database, { Database as DatabaseType } from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/index.js';
import { initializeSettingsTables } from './settings.js';

// Database file path from config
const DB_PATH = join(process.cwd(), env.DATABASE_PATH);
const DATA_DIR = dirname(DB_PATH);

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Flag to track initialization status
let isInitialized = false;

/**
 * Run a synchronous function inside a database transaction.
 * Automatically commits on success and rolls back on error.
 * Note: Transaction functions do NOT work with async functions (better-sqlite3 limitation).
 */
export function runTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

/**
 * Initialize database tables (called explicitly from main)
 * This should only be called once at startup
 */
export function initializeDatabase(): void {
  if (isInitialized) {
    logger.warn('Database already initialized, skipping');
    return;
  }

  runTransaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS steam_users (
        discord_id TEXT PRIMARY KEY,
        steam_id TEXT NOT NULL,
        steam_name TEXT,
        registered_at INTEGER NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS playtime_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL,
        steam_id TEXT NOT NULL,
        total_playtime INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL,
        FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_playtime_history_discord_id
      ON playtime_history(discord_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_playtime_history_recorded_at
      ON playtime_history(recorded_at)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_notification_prefs (
        discord_id TEXT PRIMARY KEY,
        notify_enabled INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS game_activity_cache (
        discord_id TEXT PRIMARY KEY,
        current_game TEXT,
        game_started_at INTEGER,
        last_checked INTEGER NOT NULL
      )
    `);

    // Initialize settings tables (guild_settings, audit_logs)
    initializeSettingsTables();
  });

  isInitialized = true;
  logger.info('Database initialized');
}

/**
 * Steam user record
 */
export interface SteamUserRecord {
  discord_id: string;
  steam_id: string;
  steam_name: string | null;
  registered_at: number;
}

/**
 * Register a Discord user's Steam ID
 */
export function registerSteamUser(
  discordId: string,
  steamId: string,
  steamName?: string
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO steam_users (discord_id, steam_id, steam_name, registered_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(discordId, steamId, steamName ?? null, Date.now());
  logger.debug(`Registered Steam user: ${discordId} -> ${steamId}`);
}

/**
 * Unregister a Discord user's Steam ID
 */
export function unregisterSteamUser(discordId: string): boolean {
  const stmt = db.prepare('DELETE FROM steam_users WHERE discord_id = ?');
  const result = stmt.run(discordId);
  logger.debug(`Unregistered Steam user: ${discordId}`);
  return result.changes > 0;
}

/**
 * Get Steam ID for a Discord user
 */
export function getSteamUser(discordId: string): SteamUserRecord | null {
  const stmt = db.prepare('SELECT * FROM steam_users WHERE discord_id = ?');
  const result = stmt.get(discordId) as SteamUserRecord | undefined;
  return result ?? null;
}

/**
 * Get Steam ID only for a Discord user
 */
export function getSteamId(discordId: string): string | null {
  const user = getSteamUser(discordId);
  return user?.steam_id ?? null;
}

/**
 * Check if a Discord user has a registered Steam ID
 */
export function hasSteamRegistered(discordId: string): boolean {
  const stmt = db.prepare(
    'SELECT 1 FROM steam_users WHERE discord_id = ? LIMIT 1'
  );
  return stmt.get(discordId) !== undefined;
}

/**
 * Get all registered users count
 */
export function getRegisteredUsersCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM steam_users');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Get all registered Steam users
 */
export function getAllSteamUsers(): SteamUserRecord[] {
  const stmt = db.prepare('SELECT * FROM steam_users');
  return stmt.all() as SteamUserRecord[];
}

/**
 * SQLite's maximum bound parameters (SQLITE_MAX_VARIABLE_NUMBER)
 * Default is 999, we use 900 for safety margin
 */
const SQLITE_MAX_PARAMS = 900;

/**
 * Get registered Steam users by Discord IDs
 * Handles large ID lists by chunking to avoid SQLite's parameter limit
 */
export function getSteamUsersByDiscordIds(
  discordIds: string[]
): SteamUserRecord[] {
  if (discordIds.length === 0) return [];

  // Remove duplicates to prevent duplicate results when chunking
  const uniqueIds = [...new Set(discordIds)];

  // For small lists, use single query
  if (uniqueIds.length <= SQLITE_MAX_PARAMS) {
    const placeholders = uniqueIds.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT * FROM steam_users WHERE discord_id IN (${placeholders})`
    );
    return stmt.all(...uniqueIds) as SteamUserRecord[];
  }

  // For large lists, chunk into multiple queries
  const results: SteamUserRecord[] = [];

  for (let i = 0; i < uniqueIds.length; i += SQLITE_MAX_PARAMS) {
    const chunk = uniqueIds.slice(i, i + SQLITE_MAX_PARAMS);
    const placeholders = chunk.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT * FROM steam_users WHERE discord_id IN (${placeholders})`
    );
    const chunkResults = stmt.all(...chunk) as SteamUserRecord[];
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
  logger.debug('Database connection closed');
}

// ============ Playtime History Functions ============

/**
 * Playtime history record
 */
export interface PlaytimeHistoryRecord {
  id: number;
  discord_id: string;
  steam_id: string;
  total_playtime: number;
  recorded_at: number;
}

/**
 * Record playtime for a user
 */
export function recordPlaytime(
  discordId: string,
  steamId: string,
  totalPlaytime: number
): void {
  const stmt = db.prepare(`
    INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(discordId, steamId, totalPlaytime, Date.now());
}

/**
 * Get playtime history for a user within a time range
 */
export function getPlaytimeHistory(
  discordId: string,
  startTime: number,
  endTime: number = Date.now()
): PlaytimeHistoryRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ? AND recorded_at >= ? AND recorded_at <= ?
    ORDER BY recorded_at ASC
  `);
  return stmt.all(discordId, startTime, endTime) as PlaytimeHistoryRecord[];
}

/**
 * Get the closest playtime record at or before the given time
 * Useful for calculating accurate playtime gains over a period
 */
export function getClosestRecordBefore(
  discordId: string,
  time: number
): PlaytimeHistoryRecord | null {
  const stmt = db.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ? AND recorded_at <= ?
    ORDER BY recorded_at DESC
    LIMIT 1
  `);
  return (stmt.get(discordId, time) as PlaytimeHistoryRecord) ?? null;
}

/**
 * Get the latest playtime record for a user
 */
export function getLatestPlaytimeRecord(
  discordId: string
): PlaytimeHistoryRecord | null {
  const stmt = db.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ?
    ORDER BY recorded_at DESC
    LIMIT 1
  `);
  return (stmt.get(discordId) as PlaytimeHistoryRecord) ?? null;
}

/**
 * Get playtime change between two records
 */
export function getPlaytimeChange(
  discordId: string,
  startTime: number,
  endTime: number = Date.now()
): number {
  const history = getPlaytimeHistory(discordId, startTime, endTime);

  if (history.length < 2) {
    return 0;
  }

  const first = history[0];
  const last = history[history.length - 1];

  return last.total_playtime - first.total_playtime;
}

/**
 * Delete old playtime records (older than specified days)
 */
export function cleanupOldPlaytimeRecords(daysToKeep: number = 365): number {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const stmt = db.prepare('DELETE FROM playtime_history WHERE recorded_at < ?');
  const result = stmt.run(cutoffTime);
  return result.changes;
}

/**
 * Allowed table names for row count queries (security whitelist)
 */
const ALLOWED_TABLES = new Set([
  'steam_users',
  'playtime_history',
  'game_activity_cache',
  'guild_settings',
  'notification_settings',
  'user_notification_prefs',
  'audit_logs',
]);

/**
 * Get row count for a specific table
 * @param tableName Table name (must be in whitelist)
 * @returns Row count or null if table not allowed or doesn't exist
 */
export function getTableRowCount(tableName: string): number | null {
  if (!ALLOWED_TABLES.has(tableName)) {
    return null;
  }

  try {
    // Table name is validated against whitelist, safe to use in query
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const result = stmt.get() as { count: number } | undefined;
    return result?.count ?? null;
  } catch {
    // Table doesn't exist yet
    return null;
  }
}

// Export database instance for advanced queries (legacy - avoid direct use)
export const database: DatabaseType = db;
