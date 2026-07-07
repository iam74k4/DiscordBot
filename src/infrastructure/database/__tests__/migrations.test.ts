import { mkdir, rm } from 'fs/promises';
import { join, relative } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testRoot = join(process.cwd(), 'tmp', 'migration-tests');

async function createTestDatabasePath(): Promise<string> {
  await mkdir(testRoot, { recursive: true });
  const dbDir = join(testRoot, `db-${Date.now()}-${Math.random()}`);
  await mkdir(dbDir);
  return relative(process.cwd(), join(dbDir, 'bot.db'));
}

describe('database migrations', () => {
  afterEach(async () => {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();
    delete process.env.DATABASE_PATH;
    await rm(testRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('preserves legacy Steam data when startup migrations run', async () => {
    process.env.DATABASE_PATH = await createTestDatabasePath();
    vi.resetModules();

    const { database } = await import('../connection.js');

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

      INSERT INTO steam_users VALUES ('user-1', 'steam-1', 'Steam User', 1000);
      INSERT INTO playtime_history
        (discord_id, steam_id, total_playtime, recorded_at)
        VALUES ('user-1', 'steam-1', 120, 2000);
      INSERT INTO notification_settings
        VALUES ('guild-1', 'channel-1', 1, 3000);
      INSERT INTO user_notification_prefs VALUES ('user-1', 1);
      INSERT INTO game_activity_cache
        VALUES ('user-1', 'Game', 4000, 5000);
    `);

    const { initializeDatabase } = await import('../migrations/index.js');
    await initializeDatabase();

    const legacyTables = [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ];

    for (const table of legacyTables) {
      const row = database
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .get() as { count: number };
      expect(row.count).toBe(1);
    }
  });
});
