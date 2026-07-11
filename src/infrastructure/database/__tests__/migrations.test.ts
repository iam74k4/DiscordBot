import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const testDbPath = 'test-data-migrations/bot.db';

function resetTestDatabase(): void {
  if (existsSync('test-data-migrations')) {
    rmSync('test-data-migrations', { recursive: true, force: true });
  }
  mkdirSync(dirname(testDbPath), { recursive: true });
}

function seedLegacySteamData(): void {
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
  `);
  db.prepare(
    'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
  ).run('discord-1', 'steam-1', 'Steam User', 1);
  db.prepare(
    'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
  ).run('discord-1', 'steam-1', 120, 2);
  db.prepare(
    'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
  ).run('guild-1', 'channel-1', 1, 3);
  db.prepare(
    'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
  ).run('discord-1', 1);
  db.prepare(
    'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
  ).run('discord-1', 'Game', 4, 5);
  db.close();
}

function getCount(db: Database.Database, tableName: string): number {
  return (
    db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as {
      count: number;
    }
  ).count;
}

describe('database migrations', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = testDbPath;
    resetTestDatabase();
    vi.resetModules();
  });

  afterEach(async () => {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();
    vi.resetModules();
    rmSync('test-data-migrations', { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  });

  it('preserves legacy Steam data when migrations run on an existing database', async () => {
    seedLegacySteamData();

    const { initializeDatabase } = await import('../migrations/index.js');

    await initializeDatabase();

    const db = new Database(testDbPath, { readonly: true });
    expect(getCount(db, 'steam_users')).toBe(1);
    expect(getCount(db, 'playtime_history')).toBe(1);
    expect(getCount(db, 'notification_settings')).toBe(1);
    expect(getCount(db, 'user_notification_prefs')).toBe(1);
    expect(getCount(db, 'game_activity_cache')).toBe(1);
    db.close();
  });
});
