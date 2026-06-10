import type { Database as DatabaseType } from 'better-sqlite3';
import { rm } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const databasePaths: string[] = [];
let closeCurrentDatabase: (() => void) | undefined;

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

async function removeDatabaseFiles(databasePath: string): Promise<void> {
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}

function createDatabasePath(): string {
  const databasePath = `data/test-migrations-${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.db`;
  databasePaths.push(databasePath);
  return databasePath;
}

async function loadDatabase(databasePath: string): Promise<{
  database: DatabaseType;
  initializeDatabase: () => Promise<void>;
}> {
  restoreEnv();
  Object.assign(process.env, {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    BOT_OWNER_IDS: '123456789012345678',
    NODE_ENV: 'development',
    DATABASE_PATH: databasePath,
  });

  vi.resetModules();
  const databaseModule = await import('../index.js');
  closeCurrentDatabase = databaseModule.closeDatabase;
  return databaseModule;
}

function seedLegacySteamData(database: DatabaseType): void {
  database.exec(`
    CREATE TABLE steam_users (
      discord_id TEXT PRIMARY KEY,
      steam_id TEXT NOT NULL,
      steam_name TEXT,
      registered_at INTEGER NOT NULL
    );
    CREATE TABLE playtime_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      steam_id TEXT NOT NULL,
      total_playtime INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
    );
    CREATE TABLE notification_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE user_notification_prefs (
      discord_id TEXT PRIMARY KEY,
      notify_enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
    );
    CREATE TABLE game_activity_cache (
      discord_id TEXT PRIMARY KEY,
      current_game TEXT,
      game_started_at INTEGER,
      last_checked INTEGER NOT NULL
    );
  `);

  database
    .prepare(
      `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 'Legacy Player', 1);
  database
    .prepare(
      `INSERT INTO playtime_history
       (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 120, 2);
  database
    .prepare(
      `INSERT INTO notification_settings
       (guild_id, channel_id, enabled, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('guild-1', 'channel-1', 1, 3);
  database
    .prepare(
      `INSERT INTO user_notification_prefs (discord_id, notify_enabled)
       VALUES (?, ?)`
    )
    .run('discord-1', 1);
  database
    .prepare(
      `INSERT INTO game_activity_cache
       (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'Game', 4, 5);
}

function countRows(database: DatabaseType, tableName: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };
  return result.count;
}

beforeEach(() => {
  closeCurrentDatabase = undefined;
  restoreEnv();
  vi.resetModules();
});

afterEach(async () => {
  closeCurrentDatabase?.();
  closeCurrentDatabase = undefined;
  await Promise.all(databasePaths.splice(0).map(removeDatabaseFiles));
  restoreEnv();
  vi.resetModules();
});

describe('database migrations', () => {
  it('preserves legacy Steam data during initialization', async () => {
    const { database, initializeDatabase } =
      await loadDatabase(createDatabasePath());
    seedLegacySteamData(database);

    await initializeDatabase();

    expect(countRows(database, 'steam_users')).toBe(1);
    expect(countRows(database, 'playtime_history')).toBe(1);
    expect(countRows(database, 'notification_settings')).toBe(1);
    expect(countRows(database, 'user_notification_prefs')).toBe(1);
    expect(countRows(database, 'game_activity_cache')).toBe(1);
  });
});
