import { rmSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalDatabasePath = process.env.DATABASE_PATH;

let testDataDir: string;

function restoreDatabasePath(): void {
  if (originalDatabasePath === undefined) {
    delete process.env.DATABASE_PATH;
    return;
  }
  process.env.DATABASE_PATH = originalDatabasePath;
}

describe('database migrations', () => {
  beforeEach(() => {
    vi.resetModules();
    testDataDir = join('test-data-migrations', `${process.pid}-${Date.now()}`);
    process.env.DATABASE_PATH = join(testDataDir, 'bot.db');
  });

  afterEach(async () => {
    const { closeDatabase } = await import('../index.js');
    closeDatabase();
    vi.resetModules();
    restoreDatabasePath();
    rmSync(testDataDir, { recursive: true, force: true });
  });

  it('preserves legacy Steam data during startup migrations', async () => {
    const { database, initializeDatabase } = await import('../index.js');

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
        'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
      )
      .run('user-1', 'steam-1', 'Tester', 1);
    database
      .prepare(
        'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
      )
      .run('user-1', 'steam-1', 120, 2);
    database
      .prepare(
        'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
      )
      .run('guild-1', 'channel-1', 1, 3);
    database
      .prepare(
        'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
      )
      .run('user-1', 1);
    database
      .prepare(
        'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
      )
      .run('user-1', 'Half-Life', 4, 5);

    await initializeDatabase();

    for (const table of [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ]) {
      const row = database
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .get() as { count: number };
      expect(row.count).toBe(1);
    }
  });
});
