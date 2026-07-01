import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let closeCurrentDatabase: (() => void) | undefined;
const tempDirs: string[] = [];

async function createTestDatabasePath(): Promise<string> {
  const dir = `.tmp/migrations-${randomUUID()}`;
  await mkdir(dir, { recursive: true });
  tempDirs.push(dir);
  return `${dir}/bot.db`;
}

async function loadLegacySteamMigrations(databasePath: string): Promise<{
  database: DatabaseType;
  steamUp: () => void;
  notificationUp: () => void;
  dropSteamUp: () => void;
}> {
  process.env.DATABASE_PATH = databasePath;
  vi.resetModules();

  const connection = await import('../connection.js');
  const steamMigration = await import('../migrations/001_steam.js');
  const notificationMigration =
    await import('../migrations/002_notifications.js');
  const dropSteamMigration = await import('../migrations/005_drop_steam.js');

  closeCurrentDatabase = connection.closeDatabase;

  return {
    database: connection.database,
    steamUp: steamMigration.up,
    notificationUp: notificationMigration.up,
    dropSteamUp: dropSteamMigration.up,
  };
}

function insertLegacySteamRows(database: DatabaseType): void {
  database
    .prepare(
      `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('user-1', 'steam-1', 'Steam User', 1);

  database
    .prepare(
      `INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('user-1', 'steam-1', 120, 2);

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
    .run('user-1', 1);

  database
    .prepare(
      `INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    )
    .run('user-1', 'Game', 4, 5);
}

function getRowCount(database: DatabaseType, tableName: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };
  return result.count;
}

afterEach(async () => {
  closeCurrentDatabase?.();
  closeCurrentDatabase = undefined;
  delete process.env.DATABASE_PATH;
  vi.resetModules();

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe('database migrations', () => {
  it('keeps legacy Steam tables and data when the cleanup marker runs', async () => {
    const databasePath = await createTestDatabasePath();
    const { database, steamUp, notificationUp, dropSteamUp } =
      await loadLegacySteamMigrations(databasePath);

    steamUp();
    notificationUp();
    insertLegacySteamRows(database);

    dropSteamUp();

    expect(getRowCount(database, 'steam_users')).toBe(1);
    expect(getRowCount(database, 'playtime_history')).toBe(1);
    expect(getRowCount(database, 'notification_settings')).toBe(1);
    expect(getRowCount(database, 'user_notification_prefs')).toBe(1);
    expect(getRowCount(database, 'game_activity_cache')).toBe(1);
  });
});
