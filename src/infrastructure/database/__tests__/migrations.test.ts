import Database from 'better-sqlite3';
import { mkdir, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let testDir = '';
let relativeDbPath = '';
let closeDatabase: (() => void) | undefined;
const originalDatabasePath = process.env.DATABASE_PATH;

function seedLegacySteamData(dbPath: string): void {
  const db = new Database(dbPath);
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
      `INSERT INTO steam_users
       (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    ).run('discord-1', '76561198000000000', 'Legacy User', 1);
    db.prepare(
      `INSERT INTO playtime_history
       (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    ).run('discord-1', '76561198000000000', 120, 2);
    db.prepare(
      `INSERT INTO notification_settings
       (guild_id, channel_id, enabled, created_at)
       VALUES (?, ?, ?, ?)`
    ).run('guild-1', 'channel-1', 1, 3);
    db.prepare(
      `INSERT INTO user_notification_prefs
       (discord_id, notify_enabled)
       VALUES (?, ?)`
    ).run('discord-1', 1);
    db.prepare(
      `INSERT INTO game_activity_cache
       (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    ).run('discord-1', 'Half-Life', 4, 5);
  } finally {
    db.close();
  }
}

describe('database migrations', () => {
  beforeEach(async () => {
    vi.resetModules();
    testDir = `data/test-migrations-${process.pid}-${Date.now()}`;
    relativeDbPath = join(testDir, 'bot.db');
    await mkdir(dirname(join(process.cwd(), relativeDbPath)), {
      recursive: true,
    });
    process.env.DATABASE_PATH = relativeDbPath;
    closeDatabase = undefined;
  });

  afterEach(async () => {
    closeDatabase?.();
    vi.resetModules();
    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }
    await rm(testDir, { recursive: true, force: true });
  });

  it('preserves legacy Steam tables and rows during startup initialization', async () => {
    seedLegacySteamData(join(process.cwd(), relativeDbPath));

    const databaseModule = await import('../index.js');
    closeDatabase = databaseModule.closeDatabase;

    await databaseModule.initializeDatabase();

    expect(
      databaseModule.database
        .prepare(
          `SELECT steam_id, steam_name
           FROM steam_users
           WHERE discord_id = ?`
        )
        .get('discord-1')
    ).toEqual({
      steam_id: '76561198000000000',
      steam_name: 'Legacy User',
    });
    expect(
      databaseModule.database
        .prepare(
          `SELECT total_playtime
           FROM playtime_history
           WHERE discord_id = ?`
        )
        .get('discord-1')
    ).toEqual({ total_playtime: 120 });
    expect(
      databaseModule.database
        .prepare(
          `SELECT channel_id
           FROM notification_settings
           WHERE guild_id = ?`
        )
        .get('guild-1')
    ).toEqual({ channel_id: 'channel-1' });
    expect(
      databaseModule.database
        .prepare(
          `SELECT notify_enabled
           FROM user_notification_prefs
           WHERE discord_id = ?`
        )
        .get('discord-1')
    ).toEqual({ notify_enabled: 1 });
    expect(
      databaseModule.database
        .prepare(
          `SELECT current_game
           FROM game_activity_cache
           WHERE discord_id = ?`
        )
        .get('discord-1')
    ).toEqual({ current_game: 'Half-Life' });
  });
});
