import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('database migrations', () => {
  let db: DatabaseType;

  beforeEach(() => {
    vi.resetModules();
    db = new Database(':memory:');
    vi.doMock('../connection.js', () => ({ database: db }));
  });

  afterEach(() => {
    vi.doUnmock('../connection.js');
    db.close();
  });

  it('preserves legacy Steam data when later migrations run', async () => {
    const [
      { up: createSteamTables },
      { up: createNotificationTables },
      { up: keepSteamData },
    ] = await Promise.all([
      import('../migrations/001_steam.js'),
      import('../migrations/002_notifications.js'),
      import('../migrations/005_drop_steam.js'),
    ]);

    createSteamTables();
    createNotificationTables();

    db.prepare(
      `
        INSERT INTO steam_users (discord_id, steam_id, steam_name, registered_at)
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', 'steam-1', 'Steam User', 1);
    db.prepare(
      `
        INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', 'steam-1', 120, 2);
    db.prepare(
      `
        INSERT INTO notification_settings (guild_id, channel_id, enabled, created_at)
        VALUES (?, ?, ?, ?)
      `
    ).run('guild-1', 'channel-1', 1, 3);
    db.prepare(
      `
        INSERT INTO user_notification_prefs (discord_id, notify_enabled)
        VALUES (?, ?)
      `
    ).run('discord-1', 1);
    db.prepare(
      `
        INSERT INTO game_activity_cache (discord_id, current_game, game_started_at, last_checked)
        VALUES (?, ?, ?, ?)
      `
    ).run('discord-1', 'Half-Life', 4, 5);

    keepSteamData();

    expect(
      db.prepare('SELECT COUNT(*) AS count FROM steam_users').get()
    ).toMatchObject({ count: 1 });
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM playtime_history').get()
    ).toMatchObject({ count: 1 });
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM notification_settings').get()
    ).toMatchObject({ count: 1 });
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM user_notification_prefs').get()
    ).toMatchObject({ count: 1 });
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM game_activity_cache').get()
    ).toMatchObject({ count: 1 });
  });
});
