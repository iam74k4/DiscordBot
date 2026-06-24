import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testDataDir = 'test-data-migrations';
const testDbPath = `${testDataDir}/bot.db`;
const originalDatabasePath = process.env.DATABASE_PATH;

function seedLegacySteamData(): void {
  mkdirSync(testDataDir, { recursive: true });
  const db = new Database(testDbPath);

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
    `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
     VALUES (?, ?, ?, ?)`
  ).run('discord-1', 'steam-1', 'Legacy Player', 1_700_000_000);
  db.prepare(
    `INSERT INTO playtime_history
       (discord_id, steam_id, total_playtime, recorded_at)
     VALUES (?, ?, ?, ?)`
  ).run('discord-1', 'steam-1', 1234, 1_700_000_100);
  db.prepare(
    `INSERT INTO notification_settings
       (guild_id, channel_id, enabled, created_at)
     VALUES (?, ?, ?, ?)`
  ).run('guild-1', 'channel-1', 1, 1_700_000_200);
  db.prepare(
    `INSERT INTO user_notification_prefs (discord_id, notify_enabled)
     VALUES (?, ?)`
  ).run('discord-1', 1);
  db.prepare(
    `INSERT INTO game_activity_cache
       (discord_id, current_game, game_started_at, last_checked)
     VALUES (?, ?, ?, ?)`
  ).run('discord-1', 'Legacy Game', 1_700_000_300, 1_700_000_400);

  db.close();
}

async function closeTestDatabase(): Promise<void> {
  try {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();
  } catch {
    // The module may not have loaded if a test fails before initialization.
  }
}

describe('database migrations', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_PATH = testDbPath;

    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    await closeTestDatabase();

    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }

    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }

    vi.resetModules();
  });

  it('preserves legacy Steam tables and rows during startup migrations', async () => {
    seedLegacySteamData();

    const { initializeDatabase } = await import('../migrations/index.js');
    const { database } = await import('../connection.js');

    await initializeDatabase();

    const steamUser = database
      .prepare(
        'SELECT steam_id, steam_name FROM steam_users WHERE discord_id = ?'
      )
      .get('discord-1') as { steam_id: string; steam_name: string } | undefined;
    const playtime = database
      .prepare(
        'SELECT total_playtime FROM playtime_history WHERE discord_id = ?'
      )
      .get('discord-1') as { total_playtime: number } | undefined;
    const notificationSettings = database
      .prepare(
        'SELECT channel_id, enabled FROM notification_settings WHERE guild_id = ?'
      )
      .get('guild-1') as { channel_id: string; enabled: number } | undefined;
    const userPrefs = database
      .prepare(
        'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
      )
      .get('discord-1') as { notify_enabled: number } | undefined;
    const activity = database
      .prepare(
        'SELECT current_game FROM game_activity_cache WHERE discord_id = ?'
      )
      .get('discord-1') as { current_game: string } | undefined;

    expect(steamUser).toEqual({
      steam_id: 'steam-1',
      steam_name: 'Legacy Player',
    });
    expect(playtime?.total_playtime).toBe(1234);
    expect(notificationSettings).toEqual({
      channel_id: 'channel-1',
      enabled: 1,
    });
    expect(userPrefs?.notify_enabled).toBe(1);
    expect(activity?.current_game).toBe('Legacy Game');
  });
});
