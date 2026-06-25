import { randomUUID } from 'crypto';
import { existsSync, rmSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Database } from 'better-sqlite3';

const originalDatabasePath = process.env.DATABASE_PATH;
const dbPaths: string[] = [];
let closeCurrentDatabase: (() => void) | undefined;

function removeDatabaseFiles(dbPath: string): void {
  for (const path of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]) {
    if (existsSync(path)) {
      rmSync(path, { force: true });
    }
  }
}

async function loadIsolatedDatabase(): Promise<{
  database: Database;
  closeDatabase: () => void;
}> {
  vi.resetModules();

  const databasePath = `data/test-migrations-${randomUUID()}.db`;
  process.env.DATABASE_PATH = databasePath;
  dbPaths.push(databasePath);

  const connection = await import('../connection.js');
  closeCurrentDatabase = connection.closeDatabase;

  return {
    database: connection.database,
    closeDatabase: connection.closeDatabase,
  };
}

async function seedLegacySteamData(database: Database): Promise<void> {
  const steamMigration = await import('../migrations/001_steam.js');
  const notificationMigration =
    await import('../migrations/002_notifications.js');

  steamMigration.up();
  notificationMigration.up();

  database
    .prepare(
      `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 'Steam User', 1);

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

function tableExists(database: Database, tableName: string): boolean {
  const result = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(tableName);

  return result !== undefined;
}

function rowCount(database: Database, tableName: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };

  return result.count;
}

describe('database migrations', () => {
  afterEach(() => {
    closeCurrentDatabase?.();
    closeCurrentDatabase = undefined;
    vi.resetModules();

    for (const dbPath of dbPaths.splice(0)) {
      removeDatabaseFiles(dbPath);
    }

    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }
  });

  it('preserves legacy Steam tables and data during full initialization', async () => {
    const { database } = await loadIsolatedDatabase();
    await seedLegacySteamData(database);

    const { initializeDatabase } = await import('../migrations/index.js');
    await initializeDatabase();

    const legacySteamTables = [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ];

    for (const tableName of legacySteamTables) {
      expect(tableExists(database, tableName)).toBe(true);
      expect(rowCount(database, tableName)).toBe(1);
    }
  });
});
