import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const databaseState = vi.hoisted(() => ({
  database: null as DatabaseType | null,
}));

vi.mock('../connection.js', () => ({
  database: new Proxy({} as DatabaseType, {
    get(_target, prop, receiver) {
      if (!databaseState.database) {
        throw new Error('Test database has not been initialized');
      }

      const value = Reflect.get(databaseState.database, prop, receiver);
      return typeof value === 'function'
        ? value.bind(databaseState.database)
        : value;
    },
  }),
}));

import { up as createSteamTables } from '../migrations/001_steam.js';
import { up as createNotificationTables } from '../migrations/002_notifications.js';
import { up as removeSteamFeatureRuntime } from '../migrations/005_drop_steam.js';

function tableExists(tableName: string): boolean {
  const row = databaseState.database
    ?.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(tableName) as { name: string } | undefined;

  return row?.name === tableName;
}

function tableCount(tableName: string): number {
  const row = databaseState.database
    ?.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number } | undefined;

  return row?.count ?? 0;
}

describe('database migrations', () => {
  beforeEach(() => {
    databaseState.database = new Database(':memory:');
  });

  afterEach(() => {
    databaseState.database?.close();
    databaseState.database = null;
  });

  it('preserves legacy Steam data when applying the Steam removal marker', () => {
    createSteamTables();
    createNotificationTables();

    databaseState.database
      ?.prepare(
        `
        INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('discord-1', 'steam-1', 'Alice', 1_700_000_000);
    databaseState.database
      ?.prepare(
        `
        INSERT INTO playtime_history
          (discord_id, steam_id, total_playtime, recorded_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('discord-1', 'steam-1', 120, 1_700_000_100);
    databaseState.database
      ?.prepare(
        `
        INSERT INTO notification_settings
          (guild_id, channel_id, enabled, created_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('guild-1', 'channel-1', 1, 1_700_000_200);
    databaseState.database
      ?.prepare(
        `
        INSERT INTO user_notification_prefs (discord_id, notify_enabled)
        VALUES (?, ?)
      `
      )
      .run('discord-1', 1);
    databaseState.database
      ?.prepare(
        `
        INSERT INTO game_activity_cache
          (discord_id, current_game, game_started_at, last_checked)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('discord-1', 'Half-Life', 1_700_000_300, 1_700_000_400);

    removeSteamFeatureRuntime();

    for (const tableName of [
      'steam_users',
      'playtime_history',
      'notification_settings',
      'user_notification_prefs',
      'game_activity_cache',
    ]) {
      expect(tableExists(tableName)).toBe(true);
      expect(tableCount(tableName)).toBe(1);
    }
  });
});
