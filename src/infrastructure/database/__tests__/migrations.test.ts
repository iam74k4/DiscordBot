import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const legacySteamTables = [
  'steam_users',
  'playtime_history',
  'notification_settings',
  'user_notification_prefs',
  'game_activity_cache',
] as const;

describe('database migrations', () => {
  let testDatabase: DatabaseType;

  beforeEach(() => {
    vi.resetModules();
    testDatabase = new Database(':memory:');
    vi.doMock('../connection.js', () => ({
      database: testDatabase,
    }));
  });

  afterEach(() => {
    vi.doUnmock('../connection.js');
    testDatabase.close();
  });

  function tableExists(tableName: string): boolean {
    const row = testDatabase
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      )
      .get(tableName);
    return row !== undefined;
  }

  it('preserves legacy Steam tables and data during Steam removal migration', async () => {
    const steamMigration = await import('../migrations/001_steam.js');
    const notificationMigration =
      await import('../migrations/002_notifications.js');
    const steamRemovalMigration =
      await import('../migrations/005_drop_steam.js');

    steamMigration.up();
    notificationMigration.up();

    testDatabase
      .prepare(
        'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 'Steam User', 1);
    testDatabase
      .prepare(
        'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 120, 2);
    testDatabase
      .prepare(
        'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
      )
      .run('guild-1', 'channel-1', 1, 3);
    testDatabase
      .prepare(
        'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
      )
      .run('discord-1', 1);
    testDatabase
      .prepare(
        'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'Half-Life', 4, 5);

    steamRemovalMigration.up();

    for (const tableName of legacySteamTables) {
      expect(tableExists(tableName)).toBe(true);
      const row = testDatabase
        .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
        .get() as { count: number };
      expect(row.count).toBe(1);
    }
  });
});
