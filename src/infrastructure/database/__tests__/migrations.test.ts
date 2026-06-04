import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  db: null as DatabaseType | null,
}));

vi.mock('../connection.js', () => ({
  database: new Proxy({} as DatabaseType, {
    get(_target, prop) {
      if (!state.db) {
        throw new Error('Test database has not been initialized');
      }

      const value = Reflect.get(state.db, prop);
      return typeof value === 'function' ? value.bind(state.db) : value;
    },
  }),
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

async function runStartupMigrations(): Promise<void> {
  const { initializeDatabase } = await import('../migrations/index.js');
  await initializeDatabase();
}

function seedLegacySteamData(db: DatabaseType): void {
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

    INSERT INTO steam_users
      (discord_id, steam_id, steam_name, registered_at)
    VALUES
      ('discord-1', '76561198000000000', 'Legacy Player', 1700000000);

    INSERT INTO playtime_history
      (discord_id, steam_id, total_playtime, recorded_at)
    VALUES
      ('discord-1', '76561198000000000', 12345, 1700000100);

    INSERT INTO notification_settings
      (guild_id, channel_id, enabled, created_at)
    VALUES
      ('guild-1', 'channel-1', 1, 1700000200);

    INSERT INTO user_notification_prefs
      (discord_id, notify_enabled)
    VALUES
      ('discord-1', 1);

    INSERT INTO game_activity_cache
      (discord_id, current_game, game_started_at, last_checked)
    VALUES
      ('discord-1', 'Half-Life', 1700000300, 1700000400);
  `);
}

describe('database migrations', () => {
  beforeEach(() => {
    vi.resetModules();
    state.db = new Database(':memory:');
  });

  afterEach(() => {
    state.db?.close();
    state.db = null;
    vi.resetModules();
  });

  it('preserves legacy Steam data during startup migrations', async () => {
    const db = state.db!;
    seedLegacySteamData(db);

    await runStartupMigrations();

    expect(
      db
        .prepare('SELECT steam_name FROM steam_users WHERE discord_id = ?')
        .get('discord-1')
    ).toEqual({ steam_name: 'Legacy Player' });
    expect(
      db.prepare('SELECT total_playtime FROM playtime_history').get()
    ).toEqual({
      total_playtime: 12345,
    });
    expect(
      db.prepare('SELECT channel_id FROM notification_settings').get()
    ).toEqual({
      channel_id: 'channel-1',
    });
    expect(
      db.prepare('SELECT notify_enabled FROM user_notification_prefs').get()
    ).toEqual({
      notify_enabled: 1,
    });
    expect(
      db.prepare('SELECT current_game FROM game_activity_cache').get()
    ).toEqual({
      current_game: 'Half-Life',
    });
  });
});
