import Database from 'better-sqlite3';
import { mkdirSync, rmSync } from 'fs';
import { dirname } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const testDbPath = 'test-data/migrations-preserve-legacy/bot.db';

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

function seedLegacySteamDatabase(): void {
  mkdirSync(dirname(testDbPath), { recursive: true });
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

  db.prepare(
    'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
  ).run('user-1', 'steam-1', 'Legacy User', 1_700_000_000);
  db.prepare(
    'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
  ).run('user-1', 'steam-1', 12_345, 1_700_000_100);
  db.prepare(
    'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
  ).run('guild-1', 'channel-1', 1, 1_700_000_200);
  db.prepare(
    'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
  ).run('user-1', 1);
  db.prepare(
    'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
  ).run('user-1', 'Legacy Game', 1_700_000_300, 1_700_000_400);

  db.close();
}

async function closeTestDatabase(): Promise<void> {
  try {
    const { closeDatabase } = await import('../connection.js');
    closeDatabase();
  } catch {
    // The connection module may not have been imported when setup fails.
  }
}

beforeEach(() => {
  restoreEnv();
  Object.assign(process.env, {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    BOT_OWNER_IDS: '123456789012345678',
    DATABASE_PATH: testDbPath,
    NODE_ENV: 'development',
  });
  rmSync('test-data/migrations-preserve-legacy', {
    recursive: true,
    force: true,
  });
  vi.resetModules();
});

afterEach(async () => {
  await closeTestDatabase();
  restoreEnv();
  vi.resetModules();
  rmSync('test-data/migrations-preserve-legacy', {
    recursive: true,
    force: true,
  });
});

describe('database migrations', () => {
  it('preserves legacy Steam data during startup migrations', async () => {
    seedLegacySteamDatabase();

    const { initializeDatabase, database } = await import('../index.js');

    await initializeDatabase();

    const tables = [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ];

    for (const table of tables) {
      const row = database
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .get() as { count: number };

      expect(row.count).toBe(1);
    }
  });
});
