import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LegacySteamTable =
  | 'steam_users'
  | 'playtime_history'
  | 'notification_settings'
  | 'user_notification_prefs'
  | 'game_activity_cache';

let db: DatabaseType;

function seedLegacySteamData(): void {
  db.exec(`
    CREATE TABLE steam_users (
      discord_id TEXT PRIMARY KEY,
      steam_id TEXT NOT NULL,
      steam_name TEXT,
      registered_at INTEGER NOT NULL
    );
    INSERT INTO steam_users VALUES ('discord-1', 'steam-1', 'Player One', 1);

    CREATE TABLE playtime_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      steam_id TEXT NOT NULL,
      total_playtime INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
    INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
    VALUES ('discord-1', 'steam-1', 120, 2);

    CREATE TABLE notification_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    INSERT INTO notification_settings VALUES ('guild-1', 'channel-1', 1, 3);

    CREATE TABLE user_notification_prefs (
      discord_id TEXT PRIMARY KEY,
      notify_enabled INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO user_notification_prefs VALUES ('discord-1', 1);

    CREATE TABLE game_activity_cache (
      discord_id TEXT PRIMARY KEY,
      current_game TEXT,
      game_started_at INTEGER,
      last_checked INTEGER NOT NULL
    );
    INSERT INTO game_activity_cache VALUES ('discord-1', 'Game', 4, 5);
  `);
}

function rowCount(table: LegacySteamTable): number {
  const result = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
    count: number;
  };
  return result.count;
}

describe('005_drop_steam migration', () => {
  beforeEach(() => {
    vi.resetModules();
    db = new Database(':memory:');
    vi.doMock('../connection.js', () => ({ database: db }));
  });

  afterEach(() => {
    vi.doUnmock('../connection.js');
    vi.resetModules();
    db.close();
  });

  it('preserves legacy Steam data for operator export or rollback', async () => {
    seedLegacySteamData();

    const { up } = await import('../migrations/005_drop_steam.js');
    up();

    expect(rowCount('steam_users')).toBe(1);
    expect(rowCount('playtime_history')).toBe(1);
    expect(rowCount('notification_settings')).toBe(1);
    expect(rowCount('user_notification_prefs')).toBe(1);
    expect(rowCount('game_activity_cache')).toBe(1);
  });
});
