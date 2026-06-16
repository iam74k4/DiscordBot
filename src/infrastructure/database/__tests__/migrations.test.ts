import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'fs/promises';
import { join, relative } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('database migrations', () => {
  const originalDatabasePath = process.env.DATABASE_PATH;
  let testDir: string | null = null;
  let closeDatabase: (() => void) | null = null;

  afterEach(async () => {
    closeDatabase?.();
    closeDatabase = null;
    vi.resetModules();
    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }

    if (testDir) {
      await rm(testDir, { force: true, recursive: true });
      testDir = null;
    }
  });

  it('preserves legacy Steam tables and rows on startup', async () => {
    testDir = await mkdtemp(join(process.cwd(), 'tmp-migrations-'));
    const databasePath = join(testDir, 'bot.db');
    const relativeDatabasePath = relative(process.cwd(), databasePath);

    seedLegacySteamData(databasePath);

    process.env.DATABASE_PATH = relativeDatabasePath;
    vi.resetModules();

    const migrations = await import('../migrations/index.js');
    const connection = await import('../connection.js');
    closeDatabase = connection.closeDatabase;

    await migrations.initializeDatabase();

    const steamUser = connection.database
      .prepare(
        'SELECT steam_id, steam_name FROM steam_users WHERE discord_id = ?'
      )
      .get('discord-1') as { steam_id: string; steam_name: string } | undefined;
    const playtimeRows = connection.database
      .prepare('SELECT COUNT(*) AS count FROM playtime_history')
      .get() as { count: number };
    const preference = connection.database
      .prepare(
        'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
      )
      .get('discord-1') as { notify_enabled: number } | undefined;
    const cachedActivity = connection.database
      .prepare(
        'SELECT current_game FROM game_activity_cache WHERE discord_id = ?'
      )
      .get('discord-1') as { current_game: string } | undefined;
    const notificationSettings = connection.database
      .prepare(
        'SELECT channel_id FROM notification_settings WHERE guild_id = ?'
      )
      .get('guild-1') as { channel_id: string } | undefined;

    expect(steamUser).toEqual({
      steam_id: '76561198000000000',
      steam_name: 'Legacy User',
    });
    expect(playtimeRows.count).toBe(1);
    expect(preference?.notify_enabled).toBe(1);
    expect(cachedActivity?.current_game).toBe('Portal');
    expect(notificationSettings?.channel_id).toBe('channel-1');
  });
});

function seedLegacySteamData(databasePath: string): void {
  const db = new Database(databasePath);

  try {
    db.exec(`
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

    db.prepare(
      `
        INSERT INTO steam_users (
          discord_id,
          steam_id,
          steam_name,
          registered_at
        )
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', '76561198000000000', 'Legacy User', 1_700_000_000);
    db.prepare(
      `
        INSERT INTO playtime_history (
          discord_id,
          steam_id,
          total_playtime,
          recorded_at
        )
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', '76561198000000000', 120, 1_700_000_001);
    db.prepare(
      `
        INSERT INTO notification_settings (
          guild_id,
          channel_id,
          enabled,
          created_at
        )
        VALUES (?, ?, ?, ?)
      `
    ).run('guild-1', 'channel-1', 1, 1_700_000_002);
    db.prepare(
      `
        INSERT INTO user_notification_prefs (discord_id, notify_enabled)
        VALUES (?, ?)
      `
    ).run('discord-1', 1);
    db.prepare(
      `
        INSERT INTO game_activity_cache (
          discord_id,
          current_game,
          game_started_at,
          last_checked
        )
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', 'Portal', 1_700_000_003, 1_700_000_004);
  } finally {
    db.close();
  }
}
