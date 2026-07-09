import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { dirname } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

let closeDatabase: (() => void) | undefined;
const runtimePaths: string[] = [];

function useIsolatedDatabase(): void {
  process.env.DATABASE_PATH = `data/test-migrations-${randomUUID()}/bot.db`;
  runtimePaths.push(dirname(process.env.DATABASE_PATH));
  vi.resetModules();
}

afterEach(async () => {
  closeDatabase?.();
  closeDatabase = undefined;
  vi.resetModules();

  await Promise.all(
    runtimePaths.splice(0).map((path) =>
      rm(path, {
        force: true,
        recursive: true,
      })
    )
  );
});

describe('database migrations', () => {
  it('preserves legacy Steam data after the Steam feature removal migration', async () => {
    useIsolatedDatabase();

    const connection = await import('../connection.js');
    closeDatabase = connection.closeDatabase;
    const { database } = connection;
    const { up: createSteamTables } = await import(
      '../migrations/001_steam.js'
    );
    const { up: createSteamNotificationTables } = await import(
      '../migrations/002_notifications.js'
    );
    const { initializeDatabase } = await import('../migrations/index.js');

    createSteamTables();
    createSteamNotificationTables();

    database
      .prepare(
        `
        INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('123456789012345678', '76561198000000000', 'legacy-user', 1);
    database
      .prepare(
        `
        INSERT INTO playtime_history
          (discord_id, steam_id, total_playtime, recorded_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('123456789012345678', '76561198000000000', 120, 2);
    database
      .prepare(
        `
        INSERT INTO notification_settings
          (guild_id, channel_id, enabled, created_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('guild-1', 'channel-1', 1, 3);
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
        INSERT INTO game_activity_cache
          (discord_id, current_game, game_started_at, last_checked)
        VALUES (?, ?, ?, ?)
      `
      )
      .run('123456789012345678', 'Half-Life', 4, 5);

    await initializeDatabase();

    expect(
      database.prepare('SELECT COUNT(*) AS count FROM steam_users').get()
    ).toMatchObject({ count: 1 });
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM playtime_history').get()
    ).toMatchObject({ count: 1 });
    expect(
      database
        .prepare('SELECT COUNT(*) AS count FROM notification_settings')
        .get()
    ).toMatchObject({ count: 1 });
    expect(
      database
        .prepare('SELECT COUNT(*) AS count FROM user_notification_prefs')
        .get()
    ).toMatchObject({ count: 1 });
    expect(
      database
        .prepare('SELECT COUNT(*) AS count FROM game_activity_cache')
        .get()
    ).toMatchObject({ count: 1 });
  });
});
