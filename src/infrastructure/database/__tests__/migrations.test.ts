import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const legacySteamTables = [
  'steam_users',
  'playtime_history',
  'notification_settings',
  'user_notification_prefs',
  'game_activity_cache',
] as const;

type LegacySteamTable = (typeof legacySteamTables)[number];

let closeDatabase: (() => void) | null = null;
let testDataDir: string | null = null;

function tableExists(database: DatabaseType, table: LegacySteamTable): boolean {
  const row = database
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(table) as { count: number };

  return row.count === 1;
}

function countRows(database: DatabaseType, table: LegacySteamTable): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };

  return row.count;
}

async function loadFreshDatabase() {
  vi.resetModules();

  testDataDir = path
    .join('test-data-migrations', `steam-preserve-${process.pid}-${Date.now()}`)
    .replace(/\\/g, '/');
  process.env.DATABASE_PATH = path
    .join(testDataDir, 'bot.db')
    .replace(/\\/g, '/');

  const [{ database, closeDatabase: close }, steam, notifications, dropSteam] =
    await Promise.all([
      import('../connection.js'),
      import('../migrations/001_steam.js'),
      import('../migrations/002_notifications.js'),
      import('../migrations/005_drop_steam.js'),
    ]);

  closeDatabase = close;

  return { database, steam, notifications, dropSteam };
}

describe('database migrations', () => {
  afterEach(() => {
    closeDatabase?.();
    closeDatabase = null;

    if (testDataDir && fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    testDataDir = null;
    delete process.env.DATABASE_PATH;
    vi.resetModules();
  });

  it('preserves legacy Steam tables and data after the removal migration', async () => {
    const { database, steam, notifications, dropSteam } =
      await loadFreshDatabase();

    steam.up();
    notifications.up();

    database
      .prepare(
        'INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 'Test Player', 1_700_000_000);
    database
      .prepare(
        'INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'steam-1', 120, 1_700_000_100);
    database
      .prepare(
        'INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at) VALUES (?, ?, ?, ?)'
      )
      .run('guild-1', 'channel-1', 1, 1_700_000_200);
    database
      .prepare(
        'INSERT INTO user_notification_prefs (discord_id, notify_enabled) VALUES (?, ?)'
      )
      .run('discord-1', 1);
    database
      .prepare(
        'INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked) VALUES (?, ?, ?, ?)'
      )
      .run('discord-1', 'Game', 1_700_000_300, 1_700_000_400);

    dropSteam.up();

    for (const table of legacySteamTables) {
      expect(tableExists(database, table)).toBe(true);
      expect(countRows(database, table)).toBe(1);
    }
  });
});
