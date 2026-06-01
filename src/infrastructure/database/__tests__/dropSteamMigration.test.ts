import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  database: undefined as DatabaseType | undefined,
}));

vi.mock('../connection.js', () => ({
  get database() {
    if (!state.database) {
      throw new Error('Test database has not been initialized');
    }
    return state.database;
  },
}));

import { up as createSteamTables } from '../migrations/001_steam.js';
import { up as createSteamNotificationTables } from '../migrations/002_notifications.js';
import { up as preserveLegacySteamTables } from '../migrations/005_drop_steam.js';

function getCount(tableName: string): number {
  const row = state.database
    ?.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number } | undefined;

  return row?.count ?? 0;
}

describe('005_drop_steam migration', () => {
  beforeEach(() => {
    state.database = new Database(':memory:');
    createSteamTables();
    createSteamNotificationTables();

    state.database
      .prepare(
        `INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
         VALUES ('user-1', 'steam-1', 'Steam User', 1000)`
      )
      .run();
    state.database
      .prepare(
        `INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
         VALUES ('user-1', 'steam-1', 120, 2000)`
      )
      .run();
    state.database
      .prepare(
        `INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at)
         VALUES ('guild-1', 'channel-1', 1, 3000)`
      )
      .run();
    state.database
      .prepare(
        `INSERT INTO user_notification_prefs (discord_id, notify_enabled)
         VALUES ('user-1', 1)`
      )
      .run();
    state.database
      .prepare(
        `INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked)
         VALUES ('user-1', 'Game', 4000, 5000)`
      )
      .run();
  });

  afterEach(() => {
    state.database?.close();
    state.database = undefined;
  });

  it('preserves legacy Steam tables and rows', () => {
    preserveLegacySteamTables();

    expect(getCount('steam_users')).toBe(1);
    expect(getCount('playtime_history')).toBe(1);
    expect(getCount('notification_settings')).toBe(1);
    expect(getCount('user_notification_prefs')).toBe(1);
    expect(getCount('game_activity_cache')).toBe(1);
  });
});
