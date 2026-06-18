import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted((): { database: DatabaseType | null } => ({
  database: null,
}));

vi.mock('../connection.js', () => ({
  get database() {
    if (!state.database) {
      throw new Error('Test database has not been initialized');
    }
    return state.database;
  },
}));

const { up: preserveSteamTables } =
  await import('../migrations/005_drop_steam.js');

function getDatabase(): DatabaseType {
  if (!state.database) {
    throw new Error('Test database has not been initialized');
  }
  return state.database;
}

function seedLegacySteamData(database: DatabaseType): void {
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

    INSERT INTO steam_users
      (discord_id, steam_id, steam_name, registered_at)
      VALUES ('123', '76561198000000000', 'legacy user', 1700000000);
    INSERT INTO playtime_history
      (discord_id, steam_id, total_playtime, recorded_at)
      VALUES ('123', '76561198000000000', 42, 1700000100);
    INSERT INTO notification_settings
      (guild_id, channel_id, enabled, created_at)
      VALUES ('guild', 'channel', 1, 1700000200);
    INSERT INTO user_notification_prefs
      (discord_id, notify_enabled)
      VALUES ('123', 1);
    INSERT INTO game_activity_cache
      (discord_id, current_game, game_started_at, last_checked)
      VALUES ('123', 'Half-Life', 1700000300, 1700000400);
  `);
}

function tableExists(database: DatabaseType, tableName: string): boolean {
  const result = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(result);
}

function getSingleValue<T>(database: DatabaseType, query: string): T {
  const row = database.prepare(query).pluck().get() as T | undefined;
  if (row === undefined) {
    throw new Error(`Query returned no rows: ${query}`);
  }
  return row;
}

describe('database migrations', () => {
  beforeEach(() => {
    state.database = new Database(':memory:');
    seedLegacySteamData(state.database);
  });

  afterEach(() => {
    state.database?.close();
    state.database = null;
  });

  it('preserves legacy Steam tables and data when Steam removal migration runs', () => {
    const database = getDatabase();

    preserveSteamTables();

    expect(tableExists(database, 'steam_users')).toBe(true);
    expect(tableExists(database, 'playtime_history')).toBe(true);
    expect(tableExists(database, 'notification_settings')).toBe(true);
    expect(tableExists(database, 'user_notification_prefs')).toBe(true);
    expect(tableExists(database, 'game_activity_cache')).toBe(true);

    expect(
      getSingleValue<number>(database, 'SELECT COUNT(*) FROM steam_users')
    ).toBe(1);
    expect(
      getSingleValue<number>(database, 'SELECT COUNT(*) FROM playtime_history')
    ).toBe(1);
    expect(
      getSingleValue<number>(
        database,
        'SELECT COUNT(*) FROM notification_settings'
      )
    ).toBe(1);
    expect(
      getSingleValue<number>(
        database,
        'SELECT COUNT(*) FROM user_notification_prefs'
      )
    ).toBe(1);
    expect(
      getSingleValue<number>(
        database,
        'SELECT COUNT(*) FROM game_activity_cache'
      )
    ).toBe(1);
  });
});
