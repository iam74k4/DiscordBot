import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = 'test-data-migrations';
const testDbPath = path.join(testDataDir, 'bot.db');
const originalDatabasePath = process.env.DATABASE_PATH;

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('database migrations', () => {
  beforeEach(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    fs.mkdirSync(testDataDir, { recursive: true });
    process.env.DATABASE_PATH = testDbPath;
    vi.resetModules();
  });

  afterEach(async () => {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();

    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }

    vi.resetModules();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  it('preserves legacy Steam data when current migrations run', async () => {
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
    `);

    database
      .prepare(
        `
        INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run(
        '123456789012345678',
        '76561198000000000',
        'Legacy User',
        1_700_000_000
      );
    database
      .prepare(
        `
        INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('123456789012345678', '76561198000000000', 42_000, 1_700_000_100);
    database
      .prepare(
        `
        INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('987654321098765432', '222222222222222222', 1, 1_700_000_200);
    database
      .prepare(
        `
        INSERT INTO user_notification_prefs (discord_id, notify_enabled)
        VALUES (?, ?)
      `
      )
      .run('123456789012345678', 1);
    database
      .prepare(
        `
        INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('123456789012345678', 'Factorio', 1_700_000_300, 1_700_000_400);

    const { initializeDatabase } = await import('../migrations/index.js');
    await initializeDatabase();

    expect(
      database.prepare('SELECT steam_name FROM steam_users').get()
    ).toEqual({
      steam_name: 'Legacy User',
    });
    expect(
      database.prepare('SELECT total_playtime FROM playtime_history').get()
    ).toEqual({
      total_playtime: 42_000,
    });
    expect(
      database.prepare('SELECT channel_id FROM notification_settings').get()
    ).toEqual({
      channel_id: '222222222222222222',
    });
    expect(
      database
        .prepare('SELECT notify_enabled FROM user_notification_prefs')
        .get()
    ).toEqual({
      notify_enabled: 1,
    });
    expect(
      database.prepare('SELECT current_game FROM game_activity_cache').get()
    ).toEqual({
      current_game: 'Factorio',
    });
  });
});
