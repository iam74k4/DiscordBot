import { rm } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

const originalDatabasePath = process.env.DATABASE_PATH;
const legacySteamTables = [
  'steam_users',
  'playtime_history',
  'notification_settings',
  'user_notification_prefs',
  'game_activity_cache',
] as const;

let databasePath: string;
let closeDatabase: (() => void) | undefined;

async function removeDatabaseFiles(path: string): Promise<void> {
  await Promise.all(
    [path, `${path}-shm`, `${path}-wal`].map((file) =>
      rm(file, { force: true })
    )
  );
}

function tableExists(database: DatabaseType, table: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return row !== undefined;
}

function rowCount(
  database: DatabaseType,
  table: (typeof legacySteamTables)[number]
): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };
  return row.count;
}

beforeEach(async () => {
  vi.resetModules();
  databasePath = `data/test-migrations-${process.pid}-${Date.now()}.db`;
  process.env.DATABASE_PATH = databasePath;
  await removeDatabaseFiles(databasePath);
});

afterEach(async () => {
  closeDatabase?.();
  closeDatabase = undefined;

  if (originalDatabasePath === undefined) {
    delete process.env.DATABASE_PATH;
  } else {
    process.env.DATABASE_PATH = originalDatabasePath;
  }

  vi.resetModules();
  await removeDatabaseFiles(databasePath);
});

describe('database migrations', () => {
  it('preserves legacy Steam data after the Steam feature removal migration', async () => {
    const { database, closeDatabase: close } = await import('../connection.js');
    const { up: createSteamTables } =
      await import('../migrations/001_steam.js');
    const { up: createSteamNotificationTables } =
      await import('../migrations/002_notifications.js');
    const { up: preserveLegacySteamTables } =
      await import('../migrations/005_drop_steam.js');
    closeDatabase = close;

    createSteamTables();
    createSteamNotificationTables();

    database
      .prepare(
        'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 'Test User', 1);
    database
      .prepare(
        'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 120, 2);
    database
      .prepare(
        'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
      )
      .run('guild-1', 'channel-1', 1, 3);
    database
      .prepare(
        'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
      )
      .run('discord-1', 1);
    database
      .prepare(
        'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'Test Game', 4, 5);

    preserveLegacySteamTables();

    for (const table of legacySteamTables) {
      expect(tableExists(database, table)).toBe(true);
      expect(rowCount(database, table)).toBe(1);
    }
  });
});
