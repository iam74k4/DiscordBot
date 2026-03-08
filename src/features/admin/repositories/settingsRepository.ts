import { database } from '../../../services/database/connection.js';

export interface GuildSettingsRecord {
  guild_id: string;
  language: string;
  audit_channel_id: string | null;
  created_at: number;
  updated_at: number;
}

function getGuildSettings(guildId: string): GuildSettingsRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM guild_settings WHERE guild_id = ?'
  );
  return (stmt.get(guildId) as GuildSettingsRecord) ?? null;
}

function setGuildSettings(
  guildId: string,
  settings: Partial<
    Omit<GuildSettingsRecord, 'guild_id' | 'created_at' | 'updated_at'>
  >
): void {
  const existing = getGuildSettings(guildId);
  const now = Date.now();

  if (existing) {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (settings.language !== undefined) {
      updates.push('language = ?');
      values.push(settings.language);
    }
    if (settings.audit_channel_id !== undefined) {
      updates.push('audit_channel_id = ?');
      values.push(settings.audit_channel_id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(guildId);

    const stmt = database.prepare(
      `UPDATE guild_settings SET ${updates.join(', ')} WHERE guild_id = ?`
    );
    stmt.run(...values);
  } else {
    const stmt = database.prepare(`
      INSERT INTO guild_settings (guild_id, language, audit_channel_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      guildId,
      settings.language ?? 'ja',
      settings.audit_channel_id ?? null,
      now,
      now
    );
  }
}

function setAuditChannel(guildId: string, channelId: string | null): void {
  setGuildSettings(guildId, { audit_channel_id: channelId });
}

function getAuditChannel(guildId: string): string | null {
  const settings = getGuildSettings(guildId);
  return settings?.audit_channel_id ?? null;
}

export const settingsRepository = {
  getAuditChannel,
  getGuildSettings,
  setAuditChannel,
  setGuildSettings,
};
