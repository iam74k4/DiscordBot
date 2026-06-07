import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';

vi.mock('../../../config/index.js', () => ({
  env: {
    DATABASE_PATH: 'test-data-migrations/bot.db',
  },
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { closeDatabase, database } from '../connection.js';
import { initializeDatabase } from '../migrations/index.js';

const testDataDir = 'test-data-migrations';

function getCount(tableName: string): number {
  const result = database
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };
  return result.count;
}

function seedLegacySteamData(): void {
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
      `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 'Player One', 1_700_000_000);
  database
    .prepare(
      `INSERT INTO playtime_history
       (discord_id, steam_id, total_playtime, recorded_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'steam-1', 1234, 1_700_000_100);
  database
    .prepare(
      `INSERT INTO notification_settings
       (guild_id, channel_id, enabled, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run('guild-1', 'channel-1', 1, 1_700_000_200);
  database
    .prepare(
      `INSERT INTO user_notification_prefs (discord_id, notify_enabled)
       VALUES (?, ?)`
    )
    .run('discord-1', 1);
  database
    .prepare(
      `INSERT INTO game_activity_cache
       (discord_id, current_game, game_started_at, last_checked)
       VALUES (?, ?, ?, ?)`
    )
    .run('discord-1', 'Half-Life', 1_700_000_300, 1_700_000_400);
}

describe('database migrations', () => {
  beforeEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  afterEach(() => {
    closeDatabase();
    vi.resetModules();

    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  it('preserves legacy Steam data after startup migrations', async () => {
    seedLegacySteamData();

    await initializeDatabase();

    expect(getCount('steam_users')).toBe(1);
    expect(getCount('playtime_history')).toBe(1);
    expect(getCount('notification_settings')).toBe(1);
    expect(getCount('user_notification_prefs')).toBe(1);
    expect(getCount('game_activity_cache')).toBe(1);
  });
});
