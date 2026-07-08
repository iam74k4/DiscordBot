import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';

const testDir = 'test-data-migrations';
const databasePath = join(testDir, 'bot.db');

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function seedLegacySteamData(): void {
  mkdirSync(dirname(databasePath), { recursive: true });
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
        VALUES ('discord-1', 'steam-1', 'Legacy User', 1000);
      INSERT INTO playtime_history
        (discord_id, steam_id, total_playtime, recorded_at)
        VALUES ('discord-1', 'steam-1', 120, 2000);
      INSERT INTO notification_settings
        (guild_id, channel_id, enabled, created_at)
        VALUES ('guild-1', 'channel-1', 1, 3000);
      INSERT INTO user_notification_prefs
        (discord_id, notify_enabled)
        VALUES ('discord-1', 1);
      INSERT INTO game_activity_cache
        (discord_id, current_game, game_started_at, last_checked)
        VALUES ('discord-1', 'Game', 4000, 5000);
    `);
  } finally {
    db.close();
  }
}

function readCounts(): Record<string, number> {
  const db = new Database(databasePath, { readonly: true });
  const countRows = (table: string): number =>
    (
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
        count: number;
      }
    ).count;

  try {
    return {
      steamUsers: countRows('steam_users'),
      playtimeHistory: countRows('playtime_history'),
      notificationSettings: countRows('notification_settings'),
      userNotificationPrefs: countRows('user_notification_prefs'),
      gameActivityCache: countRows('game_activity_cache'),
    };
  } finally {
    db.close();
  }
}

async function initializeTestDatabase(): Promise<void> {
  vi.resetModules();
  vi.doMock('../../../config/index.js', () => ({
    env: {
      DATABASE_PATH: databasePath,
    },
  }));

  const { initializeDatabase, closeDatabase } = await import('../index.js');
  try {
    await initializeDatabase();
  } finally {
    closeDatabase();
  }
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../../../config/index.js');
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('database migrations', () => {
  it('preserves legacy Steam data during initialization', async () => {
    seedLegacySteamData();

    await initializeTestDatabase();

    expect(readCounts()).toEqual({
      steamUsers: 1,
      playtimeHistory: 1,
      notificationSettings: 1,
      userNotificationPrefs: 1,
      gameActivityCache: 1,
    });
  });
});
