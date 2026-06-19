import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { database as DatabaseProxy } from '../connection.js';

const testDataDir = 'test-data-migrations';
const testDatabasePath = join(testDataDir, 'bot.db');

let closeDatabase: (() => void) | undefined;

type Database = typeof DatabaseProxy;

function countRows(database: Database, table: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };

  return result.count;
}

function seedLegacySteamData(database: Database): void {
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
      recorded_at INTEGER NOT NULL
    );

    CREATE TABLE notification_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE user_notification_prefs (
      discord_id TEXT PRIMARY KEY,
      notify_enabled INTEGER NOT NULL DEFAULT 1
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
      `INSERT INTO steam_users
       (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('123456789012345678', '76561198000000000', 'Legacy User', 1);

  database
    .prepare(
      `INSERT INTO playtime_history
       (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('123456789012345678', '76561198000000000', 120, 2);

  database
    .prepare(
      `INSERT INTO notification_settings
       (guild_id, channel_id, enabled, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('223456789012345678', '323456789012345678', 1, 3);

  database
    .prepare(
      `INSERT INTO user_notification_prefs
       (discord_id, notify_enabled)
       VALUES (?, ?)`
    )
    .run('123456789012345678', 1);

  database
    .prepare(
      `INSERT INTO game_activity_cache
       (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    )
    .run('123456789012345678', 'Portal', 4, 5);
}

describe('database migrations', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_PATH = testDatabasePath;
    rmSync(testDataDir, { recursive: true, force: true });
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    closeDatabase?.();
    closeDatabase = undefined;
    rmSync(testDataDir, { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
    vi.resetModules();
  });

  it('preserves legacy Steam rows during startup initialization', async () => {
    const databaseModule = await import('../index.js');
    const { database, initializeDatabase } = databaseModule;
    closeDatabase = databaseModule.closeDatabase;

    seedLegacySteamData(database);

    await initializeDatabase();

    expect(countRows(database, 'steam_users')).toBe(1);
    expect(countRows(database, 'playtime_history')).toBe(1);
    expect(countRows(database, 'notification_settings')).toBe(1);
    expect(countRows(database, 'user_notification_prefs')).toBe(1);
    expect(countRows(database, 'game_activity_cache')).toBe(1);
  });
});
