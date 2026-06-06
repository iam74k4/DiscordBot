import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { dirname } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const originalDatabasePath = process.env.DATABASE_PATH;
const originalDataDir = process.env.DATA_DIR;
const testPaths: string[] = [];

async function loadDatabaseModules(databasePath: string): Promise<{
  closeDatabase: typeof import('../connection.js').closeDatabase;
  database: typeof import('../connection.js').database;
  initializeDatabase: typeof import('../migrations/index.js').initializeDatabase;
  createSteamTables: typeof import('../migrations/001_steam.js').up;
  createSteamNotificationTables: typeof import('../migrations/002_notifications.js').up;
}> {
  vi.resetModules();
  process.env.DATABASE_PATH = databasePath;
  process.env.DATA_DIR = dirname(databasePath);

  const connection = await import('../connection.js');
  const migrations = await import('../migrations/index.js');
  const steamMigration = await import('../migrations/001_steam.js');
  const notificationMigration =
    await import('../migrations/002_notifications.js');

  return {
    closeDatabase: connection.closeDatabase,
    database: connection.database,
    initializeDatabase: migrations.initializeDatabase,
    createSteamTables: steamMigration.up,
    createSteamNotificationTables: notificationMigration.up,
  };
}

afterEach(async () => {
  if (originalDatabasePath === undefined) {
    delete process.env.DATABASE_PATH;
  } else {
    process.env.DATABASE_PATH = originalDatabasePath;
  }

  if (originalDataDir === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = originalDataDir;
  }

  vi.resetModules();

  await Promise.all(
    testPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe('database migrations', () => {
  it('preserves legacy Steam tables and rows during startup migrations', async () => {
    const testDir = `test-data/migrations-${randomUUID()}`;
    const databasePath = `${testDir}/bot.db`;
    testPaths.push(testDir);

    const {
      closeDatabase,
      createSteamNotificationTables,
      createSteamTables,
      database,
      initializeDatabase,
    } = await loadDatabaseModules(databasePath);

    try {
      createSteamTables();
      createSteamNotificationTables();

      database
        .prepare(
          `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
           VALUES (?, ?, ?, ?)`
        )
        .run('discord-1', 'steam-1', 'Legacy Player', 1_700_000_000);
      database
        .prepare(
          `INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
           VALUES (?, ?, ?, ?)`
        )
        .run('discord-1', 'steam-1', 120, 1_700_000_100);
      database
        .prepare(
          `INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at)
           VALUES (?, ?, ?, ?)`
        )
        .run('guild-1', 'channel-1', 1, 1_700_000_200);
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
        .run('discord-1', 'Half-Life', 1_700_000_300, 1_700_000_400);

      await initializeDatabase();

      expect(
        database
          .prepare('SELECT steam_name FROM steam_users WHERE discord_id = ?')
          .get('discord-1')
      ).toEqual({ steam_name: 'Legacy Player' });
      expect(
        database
          .prepare(
            'SELECT total_playtime FROM playtime_history WHERE discord_id = ?'
          )
          .get('discord-1')
      ).toEqual({ total_playtime: 120 });
      expect(
        database
          .prepare(
            'SELECT channel_id FROM notification_settings WHERE guild_id = ?'
          )
          .get('guild-1')
      ).toEqual({ channel_id: 'channel-1' });
      expect(
        database
          .prepare(
            'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
          )
          .get('discord-1')
      ).toEqual({ notify_enabled: 1 });
      expect(
        database
          .prepare(
            'SELECT current_game FROM game_activity_cache WHERE discord_id = ?'
          )
          .get('discord-1')
      ).toEqual({ current_game: 'Half-Life' });
    } finally {
      closeDatabase();
    }
  });
});
