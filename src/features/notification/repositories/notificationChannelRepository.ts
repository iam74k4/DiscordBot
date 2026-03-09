import { database } from '../../../services/database/connection.js';

export type NotificationType = 'voice' | 'member_join';

export interface NotificationChannelRecord {
  guild_id: string;
  type: NotificationType;
  channel_id: string;
  enabled: number;
  created_at: number;
  updated_at: number;
}

function get(
  guildId: string,
  type: NotificationType
): NotificationChannelRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM notification_channels WHERE guild_id = ? AND type = ?'
  );
  return (stmt.get(guildId, type) as NotificationChannelRecord) ?? null;
}

function getEnabled(guildId: string, type: NotificationType): string | null {
  const record = get(guildId, type);
  if (!record || !record.enabled) return null;
  return record.channel_id;
}

function set(guildId: string, type: NotificationType, channelId: string): void {
  const now = Date.now();
  const existing = get(guildId, type);

  if (existing) {
    const stmt = database.prepare(
      'UPDATE notification_channels SET channel_id = ?, enabled = 1, updated_at = ? WHERE guild_id = ? AND type = ?'
    );
    stmt.run(channelId, now, guildId, type);
  } else {
    const stmt = database.prepare(
      'INSERT INTO notification_channels (guild_id, type, channel_id, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)'
    );
    stmt.run(guildId, type, channelId, now, now);
  }
}

function remove(guildId: string, type: NotificationType): boolean {
  const stmt = database.prepare(
    'DELETE FROM notification_channels WHERE guild_id = ? AND type = ?'
  );
  const result = stmt.run(guildId, type);
  return result.changes > 0;
}

function getAllForGuild(guildId: string): NotificationChannelRecord[] {
  const stmt = database.prepare(
    'SELECT * FROM notification_channels WHERE guild_id = ?'
  );
  return stmt.all(guildId) as NotificationChannelRecord[];
}

export const notificationChannelRepository = {
  get,
  getEnabled,
  set,
  remove,
  getAllForGuild,
};
