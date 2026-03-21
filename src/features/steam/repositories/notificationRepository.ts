import { database } from '../../../infrastructure/database/connection.js';
import type { SteamUserRecord } from './steamUserRepository.js';

export interface NotificationSettingsRecord {
  guild_id: string;
  channel_id: string;
  enabled: number;
  created_at: number;
}

export interface UserNotificationPrefsRecord {
  discord_id: string;
  notify_enabled: number;
}

export interface GameActivityCacheRecord {
  discord_id: string;
  current_game: string | null;
  game_started_at: number | null;
  last_checked: number;
}

function setChannel(guildId: string, channelId: string): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO notification_settings (guild_id, channel_id, enabled, created_at)
    VALUES (?, ?, 1, ?)
  `);
  stmt.run(guildId, channelId, Date.now());
}

function getGuildSettings(guildId: string): NotificationSettingsRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM notification_settings WHERE guild_id = ?'
  );
  return (stmt.get(guildId) as NotificationSettingsRecord) ?? null;
}

function setGuildEnabled(guildId: string, enabled: boolean): boolean {
  const stmt = database.prepare(
    'UPDATE notification_settings SET enabled = ? WHERE guild_id = ?'
  );
  const result = stmt.run(enabled ? 1 : 0, guildId);
  return result.changes > 0;
}

function removeGuildSettings(guildId: string): boolean {
  const stmt = database.prepare(
    'DELETE FROM notification_settings WHERE guild_id = ?'
  );
  const result = stmt.run(guildId);
  return result.changes > 0;
}

function getEnabledGuilds(): NotificationSettingsRecord[] {
  const stmt = database.prepare(
    'SELECT * FROM notification_settings WHERE enabled = 1'
  );
  return stmt.all() as NotificationSettingsRecord[];
}

function setUserPreference(discordId: string, enabled: boolean): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO user_notification_prefs (discord_id, notify_enabled)
    VALUES (?, ?)
  `);
  stmt.run(discordId, enabled ? 1 : 0);
}

function getUserPreference(discordId: string): boolean {
  const stmt = database.prepare(
    'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
  );
  const result = stmt.get(discordId) as { notify_enabled: number } | undefined;
  return result?.notify_enabled !== 0;
}

function updateGameActivityCache(
  discordId: string,
  currentGame: string | null,
  gameStartedAt: number | null
): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO game_activity_cache
    (discord_id, current_game, game_started_at, last_checked)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(discordId, currentGame, gameStartedAt, Date.now());
}

function getGameActivityCache(
  discordId: string
): GameActivityCacheRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM game_activity_cache WHERE discord_id = ?'
  );
  return (stmt.get(discordId) as GameActivityCacheRecord) ?? null;
}

function getAllCachedGameActivity(): GameActivityCacheRecord[] {
  const stmt = database.prepare('SELECT * FROM game_activity_cache');
  return stmt.all() as GameActivityCacheRecord[];
}

function getNotifiableUsers(): SteamUserRecord[] {
  const stmt = database.prepare(`
    SELECT su.*
    FROM steam_users su
    LEFT JOIN user_notification_prefs unp
      ON unp.discord_id = su.discord_id
    WHERE unp.notify_enabled IS NULL OR unp.notify_enabled = 1
  `);
  return stmt.all() as SteamUserRecord[];
}

export const steamNotificationRepository = {
  getAllCachedGameActivity,
  getEnabledGuilds,
  getGameActivityCache,
  getGuildSettings,
  getNotifiableUsers,
  getUserPreference,
  removeGuildSettings,
  setChannel,
  setGuildEnabled,
  setUserPreference,
  updateGameActivityCache,
};
