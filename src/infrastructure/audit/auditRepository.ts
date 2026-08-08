import { database } from '../database/connection.js';
import { guildSettingsRepository } from '../guildSettings/index.js';

/**
 * Audit logging is cross-cutting: admin, notification, and voice all record
 * through it, so the `audit_logs` table and its action vocabulary live in
 * infrastructure rather than in whichever feature happens to display them.
 */
export type AuditAction =
  | 'NOTIFY_SETUP'
  | 'NOTIFY_ENABLE'
  | 'NOTIFY_DISABLE'
  | 'NOTIFY_REMOVE'
  | 'SETTINGS_CHANGE'
  | 'AUDIT_SETUP'
  | 'ROLE_ADD'
  | 'ROLE_REMOVE';

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

/**
 * Where audit embeds are published. The column belongs to guild settings, so
 * it is read through their repository rather than queried here.
 */
function getAuditChannel(guildId: string): string | null {
  return guildSettingsRepository.getAuditChannel(guildId);
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
