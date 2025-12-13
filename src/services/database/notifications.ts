import { database } from './index.js';

// ============ Notification Settings Functions ============

/**
 * Notification settings record
 */
export interface NotificationSettingsRecord {
  guild_id: string;
  channel_id: string;
  enabled: number;
  created_at: number;
}

/**
 * User notification preferences record
 */
export interface UserNotificationPrefsRecord {
  discord_id: string;
  notify_enabled: number;
}

/**
 * Game activity cache record
 */
export interface GameActivityCacheRecord {
  discord_id: string;
  current_game: string | null;
  game_started_at: number | null;
  last_checked: number;
}

/**
 * Set notification channel for a guild
 */
export function setNotificationChannel(
  guildId: string,
  channelId: string
): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO notification_settings (guild_id, channel_id, enabled, created_at)
    VALUES (?, ?, 1, ?)
  `);
  stmt.run(guildId, channelId, Date.now());
}

/**
 * Get notification settings for a guild
 */
export function getNotificationSettings(
  guildId: string
): NotificationSettingsRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM notification_settings WHERE guild_id = ?'
  );
  return (stmt.get(guildId) as NotificationSettingsRecord) ?? null;
}

/**
 * Enable/disable notifications for a guild
 */
export function setNotificationEnabled(
  guildId: string,
  enabled: boolean
): boolean {
  const stmt = database.prepare(
    'UPDATE notification_settings SET enabled = ? WHERE guild_id = ?'
  );
  const result = stmt.run(enabled ? 1 : 0, guildId);
  return result.changes > 0;
}

/**
 * Remove notification settings for a guild
 */
export function removeNotificationSettings(guildId: string): boolean {
  const stmt = database.prepare(
    'DELETE FROM notification_settings WHERE guild_id = ?'
  );
  const result = stmt.run(guildId);
  return result.changes > 0;
}

/**
 * Get all guilds with notifications enabled
 */
export function getEnabledNotificationGuilds(): NotificationSettingsRecord[] {
  const stmt = database.prepare(
    'SELECT * FROM notification_settings WHERE enabled = 1'
  );
  return stmt.all() as NotificationSettingsRecord[];
}

/**
 * Set user notification preference
 */
export function setUserNotificationPref(
  discordId: string,
  enabled: boolean
): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO user_notification_prefs (discord_id, notify_enabled)
    VALUES (?, ?)
  `);
  stmt.run(discordId, enabled ? 1 : 0);
}

/**
 * Get user notification preference
 */
export function getUserNotificationPref(discordId: string): boolean {
  const stmt = database.prepare(
    'SELECT notify_enabled FROM user_notification_prefs WHERE discord_id = ?'
  );
  const result = stmt.get(discordId) as { notify_enabled: number } | undefined;
  return result?.notify_enabled !== 0; // Default to true if not set
}

/**
 * Update game activity cache
 */
export function updateGameActivityCache(
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

/**
 * Get game activity cache for a user
 */
export function getGameActivityCache(
  discordId: string
): GameActivityCacheRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM game_activity_cache WHERE discord_id = ?'
  );
  return (stmt.get(discordId) as GameActivityCacheRecord) ?? null;
}

/**
 * Get all cached game activities
 */
export function getAllGameActivityCache(): GameActivityCacheRecord[] {
  const stmt = database.prepare('SELECT * FROM game_activity_cache');
  return stmt.all() as GameActivityCacheRecord[];
}

