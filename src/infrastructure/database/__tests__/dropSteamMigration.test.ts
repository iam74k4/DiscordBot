import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let db: Database.Database;

async function runSteamDropMigration(): Promise<void> {
  const { up } = await import('../migrations/005_drop_steam.js');
  up();
}

function tableExists(tableName: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    )
    .get(tableName);
  return row !== undefined;
}

function createLegacySteamTables(): void {
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
}

function seedLegacySteamData(): void {
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
}

describe('005_drop_steam migration', () => {
  beforeEach(() => {
    vi.resetModules();
    db = new Database(':memory:');
    vi.doMock('../connection.js', () => ({
      database: db,
    }));
  });

  afterEach(() => {
    db.close();
    vi.doUnmock('../connection.js');
  });

  it('archives legacy Steam tables instead of dropping their data', async () => {
    createLegacySteamTables();
    seedLegacySteamData();

    await runSteamDropMigration();

    expect(tableExists('steam_users')).toBe(false);
    expect(tableExists('playtime_history')).toBe(false);
    expect(tableExists('notification_settings')).toBe(false);
    expect(tableExists('user_notification_prefs')).toBe(false);
    expect(tableExists('game_activity_cache')).toBe(false);

    expect(tableExists('legacy_steam_users')).toBe(true);
    expect(tableExists('legacy_playtime_history')).toBe(true);
    expect(tableExists('legacy_notification_settings')).toBe(true);
    expect(tableExists('legacy_user_notification_prefs')).toBe(true);
    expect(tableExists('legacy_game_activity_cache')).toBe(true);

    expect(
      db.prepare('SELECT steam_name FROM legacy_steam_users').pluck().get()
    ).toBe('Steam User');
    expect(
      db
        .prepare('SELECT total_playtime FROM legacy_playtime_history')
        .pluck()
        .get()
    ).toBe(120);
    expect(
      db
        .prepare('SELECT channel_id FROM legacy_notification_settings')
        .pluck()
        .get()
    ).toBe('channel-1');
  });

  it('keeps archived data when the startup migrations are rerun', async () => {
    createLegacySteamTables();
    seedLegacySteamData();
    await runSteamDropMigration();

    createLegacySteamTables();
    await runSteamDropMigration();

    expect(tableExists('steam_users')).toBe(false);
    expect(
      db.prepare('SELECT COUNT(*) FROM legacy_steam_users').pluck().get()
    ).toBe(1);
    expect(
      db.prepare('SELECT steam_name FROM legacy_steam_users').pluck().get()
    ).toBe('Steam User');
  });
});
