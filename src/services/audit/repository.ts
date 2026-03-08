import { database } from '../database/connection.js';

export type AuditAction =
  | 'STEAM_REGISTER'
  | 'STEAM_UNREGISTER'
  | 'NOTIFY_SETUP'
  | 'NOTIFY_ENABLE'
  | 'NOTIFY_DISABLE'
  | 'NOTIFY_REMOVE'
  | 'SETTINGS_CHANGE'
  | 'AUDIT_SETUP';

export interface AuditLogRecord {
  id: number;
  guild_id: string;
  user_id: string;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: number;
}

function createLog(
  guildId: string,
  userId: string,
  action: AuditAction,
  targetId?: string,
  details?: string
): void {
  const stmt = database.prepare(`
    INSERT INTO audit_logs (guild_id, user_id, action, target_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    guildId,
    userId,
    action,
    targetId ?? null,
    details ?? null,
    Date.now()
  );
}

function getAuditChannel(guildId: string): string | null {
  const stmt = database.prepare(
    'SELECT audit_channel_id FROM guild_settings WHERE guild_id = ?'
  );
  const result = stmt.get(guildId) as
    | { audit_channel_id: string | null }
    | undefined;
  return result?.audit_channel_id ?? null;
}

function getLogs(guildId: string, limit: number = 50): AuditLogRecord[] {
  const stmt = database.prepare(`
    SELECT * FROM audit_logs
    WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(guildId, limit) as AuditLogRecord[];
}

function getLogsCount(guildId: string): number {
  const stmt = database.prepare(
    'SELECT COUNT(*) as count FROM audit_logs WHERE guild_id = ?'
  );
  const result = stmt.get(guildId) as { count: number };
  return result.count;
}

function deleteOldLogs(daysOld: number): number {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const stmt = database.prepare('DELETE FROM audit_logs WHERE created_at < ?');
  const result = stmt.run(cutoff);
  return result.changes;
}

export const auditRepository = {
  createLog,
  deleteOldLogs,
  getAuditChannel,
  getLogs,
  getLogsCount,
};
