import { database } from '../../../infrastructure/database/connection.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

interface AutoJoinRow {
  voice_autojoin_enabled: number;
}

/**
 * Whether the bot may auto-join voice channels in this guild.
 * Defaults to enabled - a guild with no settings row has not opted out.
 * Read errors default to enabled too, matching the behaviour before the
 * setting existed.
 */
function isAutoJoinEnabled(guildId: string): boolean {
  try {
    const row = database
      .prepare(
        'SELECT voice_autojoin_enabled FROM guild_settings WHERE guild_id = ?'
      )
      .get(guildId) as AutoJoinRow | undefined;
    return row ? row.voice_autojoin_enabled === 1 : true;
  } catch (error) {
    logger.debug(
      `Failed to read auto-join setting for ${guildId}: ${getErrorMessage(error)}`
    );
    return true;
  }
}

function setAutoJoinEnabled(guildId: string, enabled: boolean): void {
  const now = Date.now();
  const existing = database
    .prepare('SELECT guild_id FROM guild_settings WHERE guild_id = ?')
    .get(guildId);

  if (existing) {
    database
      .prepare(
        'UPDATE guild_settings SET voice_autojoin_enabled = ?, updated_at = ? WHERE guild_id = ?'
      )
      .run(enabled ? 1 : 0, now, guildId);
    return;
  }

  database
    .prepare(
      `INSERT INTO guild_settings (guild_id, language, audit_channel_id, voice_autojoin_enabled, created_at, updated_at)
       VALUES (?, NULL, NULL, ?, ?, ?)`
    )
    .run(guildId, enabled ? 1 : 0, now, now);
}

function isChannelExcluded(guildId: string, channelId: string): boolean {
  try {
    const row = database
      .prepare(
        'SELECT 1 as found FROM voice_autojoin_exclusions WHERE guild_id = ? AND channel_id = ?'
      )
      .get(guildId, channelId);
    return row !== undefined;
  } catch (error) {
    logger.debug(
      `Failed to read auto-join exclusions for ${guildId}: ${getErrorMessage(error)}`
    );
    return false;
  }
}

function addExclusion(guildId: string, channelId: string): void {
  database
    .prepare(
      `INSERT OR IGNORE INTO voice_autojoin_exclusions (guild_id, channel_id, created_at)
       VALUES (?, ?, ?)`
    )
    .run(guildId, channelId, Date.now());
}

function removeExclusion(guildId: string, channelId: string): boolean {
  const result = database
    .prepare(
      'DELETE FROM voice_autojoin_exclusions WHERE guild_id = ? AND channel_id = ?'
    )
    .run(guildId, channelId);
  return result.changes > 0;
}

function listExclusions(guildId: string): string[] {
  try {
    const rows = database
      .prepare(
        'SELECT channel_id FROM voice_autojoin_exclusions WHERE guild_id = ? ORDER BY created_at ASC'
      )
      .all(guildId) as Array<{ channel_id: string }>;
    return rows.map((row) => row.channel_id);
  } catch (error) {
    logger.debug(
      `Failed to list auto-join exclusions for ${guildId}: ${getErrorMessage(error)}`
    );
    return [];
  }
}

/** True when the bot is allowed to buffer audio in this specific channel. */
function mayAutoJoin(guildId: string, channelId: string): boolean {
  return isAutoJoinEnabled(guildId) && !isChannelExcluded(guildId, channelId);
}

export const voiceSettingsRepository = {
  addExclusion,
  isAutoJoinEnabled,
  isChannelExcluded,
  listExclusions,
  mayAutoJoin,
  removeExclusion,
  setAutoJoinEnabled,
};
