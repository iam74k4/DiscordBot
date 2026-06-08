import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import type { Database as DatabaseType } from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('database migrations', () => {
  let closeDatabase: (() => void) | undefined;
  let testDataDir: string | undefined;

  afterEach(async () => {
    closeDatabase?.();
    closeDatabase = undefined;
    vi.resetModules();
    vi.doUnmock('../../../config/index.js');
    vi.doUnmock('../../../shared/utils/logger.js');

    if (testDataDir && existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }
    testDataDir = undefined;
  });

  it('preserves legacy Steam data during startup migrations', async () => {
    testDataDir = join('.test-data', `migrations-${randomUUID()}`);
    const testDbPath = join(testDataDir, 'bot.db');
    await mkdir(testDataDir, { recursive: true });

    vi.doMock('../../../config/index.js', () => ({
      env: {
        DATABASE_PATH: testDbPath,
      },
    }));
    vi.doMock('../../../shared/utils/logger.js', () => ({
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    }));

    const connection = await import('../connection.js');
    closeDatabase = connection.closeDatabase;
    const { database } = connection;
    seedLegacySteamData(database);

    const { initializeDatabase } = await import('../migrations/index.js');
    await initializeDatabase();

    expect(tableExists(database, 'steam_users')).toBe(true);
    expect(tableExists(database, 'playtime_history')).toBe(true);
    expect(tableExists(database, 'notification_settings')).toBe(true);
    expect(tableExists(database, 'user_notification_prefs')).toBe(true);
    expect(tableExists(database, 'game_activity_cache')).toBe(true);

    expect(countRows(database, 'steam_users')).toBe(1);
    expect(countRows(database, 'playtime_history')).toBe(1);
    expect(countRows(database, 'notification_settings')).toBe(1);
    expect(countRows(database, 'user_notification_prefs')).toBe(1);
    expect(countRows(database, 'game_activity_cache')).toBe(1);
  });
});

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
      `INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 120, 2);
  database
    .prepare(
      `INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at)
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
      `INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'Half-Life', 4, 5);
}

function tableExists(database: DatabaseType, tableName: string): boolean {
  const row = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(tableName);

  return row !== undefined;
}

function countRows(database: DatabaseType, tableName: string): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };

  return row.count;
}
