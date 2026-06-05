import { rm } from 'fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

type CountRow = { count: number };

const originalEnv = { ...process.env };
let closeCurrentDatabase: (() => void) | undefined;
let testDataDir: string | undefined;

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

function createTestDatabasePath(): string {
  const suffix = `${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  testDataDir = `test-runtime/migrations-${suffix}`;
  return `${testDataDir}/bot.db`;
}

async function loadLegacySteamMigrations(databasePath: string): Promise<{
  database: DatabaseType;
  steamMigration: typeof import('../migrations/001_steam.ts');
  notificationMigration: typeof import('../migrations/002_notifications.ts');
  steamCleanupMigration: typeof import('../migrations/005_drop_steam.ts');
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

  const connection = await import('../connection.ts');
  closeCurrentDatabase = connection.closeDatabase;

  return {
    database: connection.database,
    steamMigration: await import('../migrations/001_steam.ts'),
    notificationMigration: await import('../migrations/002_notifications.ts'),
    steamCleanupMigration: await import('../migrations/005_drop_steam.ts'),
  };
}

function countRows(database: DatabaseType, tableName: string): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as CountRow;
  return row.count;
}

function tableExists(database: DatabaseType, tableName: string): boolean {
  return (
    database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      )
      .get(tableName) !== undefined
  );
}

afterEach(async () => {
  closeCurrentDatabase?.();
  closeCurrentDatabase = undefined;
  vi.resetModules();
  restoreEnv();

  if (testDataDir) {
    await rm(testDataDir, { recursive: true, force: true });
    testDataDir = undefined;
  }
});

describe('database migrations', () => {
  it('preserves legacy Steam data when the Steam cleanup migration runs', async () => {
    const migrations = await loadLegacySteamMigrations(createTestDatabasePath());
    const {
      database,
      steamMigration,
      notificationMigration,
      steamCleanupMigration,
    } = migrations;

    steamMigration.up();
    notificationMigration.up();

    database
      .prepare(
        `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
         VALUES (?, ?, ?, ?)`
      )
      .run('discord-1', '76561198000000000', 'Steam User', 1);
    database
      .prepare(
        `INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
         VALUES (?, ?, ?, ?)`
      )
      .run('discord-1', '76561198000000000', 120, 2);
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

    steamCleanupMigration.up();

    const legacyTables = [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ];

    for (const tableName of legacyTables) {
      expect(tableExists(database, tableName)).toBe(true);
      expect(countRows(database, tableName)).toBe(1);
    }
  });
});
