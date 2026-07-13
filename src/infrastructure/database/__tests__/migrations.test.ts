import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testDbPath = 'test-data-migrations/bot.db';
const testDataDir = dirname(testDbPath);

vi.mock('../../../config/index.js', () => ({
  env: {
    DATABASE_PATH: testDbPath,
  },
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function seedLegacySteamDatabase(): void {
  const absoluteDbPath = join(process.cwd(), testDbPath);
  const absoluteDataDir = dirname(absoluteDbPath);

  if (!existsSync(absoluteDataDir)) {
    mkdirSync(absoluteDataDir, { recursive: true });
  }

  const db = new Database(absoluteDbPath);

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
  `);

  db.prepare('INSERT INTO steam_users VALUES (?, ?, ?, ?)').run(
    'discord-1',
    'steam-1',
    'Legacy Player',
    1000
  );
  db.prepare(
    'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
  ).run('discord-1', 'steam-1', 360, 2000);
  db.prepare('INSERT INTO notification_settings VALUES (?, ?, ?, ?)').run(
    'guild-1',
    'channel-1',
    1,
    3000
  );
  db.prepare('INSERT INTO user_notification_prefs VALUES (?, ?)').run(
    'discord-1',
    1
  );
  db.prepare('INSERT INTO game_activity_cache VALUES (?, ?, ?, ?)').run(
    'discord-1',
    'Half-Life',
    4000,
    5000
  );

  db.close();
}

describe('database migrations', () => {
  beforeEach(() => {
    vi.resetModules();
    rmSync(testDataDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();
    rmSync(testDataDir, { recursive: true, force: true });
  });

  it('preserves legacy Steam data when migrations run against an existing database', async () => {
    seedLegacySteamDatabase();

    const { initializeDatabase } = await import('../migrations/index.js');
    const { database } = await import('../connection.js');

    await initializeDatabase();

    expect(
      database
        .prepare(
          'SELECT steam_id, steam_name FROM steam_users WHERE discord_id = ?'
        )
        .get('discord-1')
    ).toEqual({ steam_id: 'steam-1', steam_name: 'Legacy Player' });
    expect(
      database
        .prepare(
          'SELECT total_playtime FROM playtime_history WHERE discord_id = ?'
        )
        .get('discord-1')
    ).toEqual({ total_playtime: 360 });
    expect(
      database
        .prepare(
          'SELECT channel_id, enabled FROM notification_settings WHERE guild_id = ?'
        )
        .get('guild-1')
    ).toEqual({ channel_id: 'channel-1', enabled: 1 });
    expect(
      database
        .prepare(
          'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
        )
        .get('discord-1')
    ).toEqual({ notify_enabled: 1 });
    expect(
      database
        .prepare(
          'SELECT current_game FROM game_activity_cache WHERE discord_id = ?'
        )
        .get('discord-1')
    ).toEqual({ current_game: 'Half-Life' });
  });
});
