import { database } from './index.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize settings tables
 */
export function initializeSettingsTables(): void {
  // Guild settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      language TEXT DEFAULT 'ja',
      audit_channel_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Audit logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_id
    ON audit_logs(guild_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at)
  `);

  logger.debug('Settings and audit tables initialized');
}

// ============ Guild Settings ============

/**
 * Guild settings record
 */
export interface GuildSettingsRecord {
  guild_id: string;
  language: string;
  audit_channel_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Get guild settings
 */
export function getGuildSettings(guildId: string): GuildSettingsRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM guild_settings WHERE guild_id = ?'
  );
  return (stmt.get(guildId) as GuildSettingsRecord) ?? null;
}

/**
 * Create or update guild settings
 */
export function setGuildSettings(
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

/**
 * Set audit channel
 */
export function setAuditChannel(
  guildId: string,
  channelId: string | null
): void {
  setGuildSettings(guildId, { audit_channel_id: channelId });
}

/**
 * Get audit channel
 */
export function getAuditChannel(guildId: string): string | null {
  const settings = getGuildSettings(guildId);
  return settings?.audit_channel_id ?? null;
}

// ============ Audit Logs ============

/**
 * Audit log record
 */
export interface AuditLogRecord {
  id: number;
  guild_id: string;
  user_id: string;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: number;
}

/**
 * Audit action types
 */
export type AuditAction =
  | 'STEAM_REGISTER'
  | 'STEAM_UNREGISTER'
  | 'NOTIFY_SETUP'
  | 'NOTIFY_ENABLE'
  | 'NOTIFY_DISABLE'
  | 'NOTIFY_REMOVE'
  | 'SETTINGS_CHANGE'
  | 'AUDIT_SETUP';

/**
 * Create audit log entry
 */
export function createAuditLog(
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
 * Get audit logs for a guild
 */
export function getAuditLogs(
  guildId: string,
  limit: number = 50
): AuditLogRecord[] {
  const stmt = database.prepare(`
    SELECT * FROM audit_logs
    WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(guildId, limit) as AuditLogRecord[];
}

/**
 * Get audit logs count for a guild
 */
export function getAuditLogsCount(guildId: string): number {
  const stmt = database.prepare(
    'SELECT COUNT(*) as count FROM audit_logs WHERE guild_id = ?'
  );
  const result = stmt.get(guildId) as { count: number };
  return result.count;
}

/**
 * Delete audit logs older than specified days
 */
export function deleteOldAuditLogs(daysOld: number): number {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const stmt = database.prepare('DELETE FROM audit_logs WHERE created_at < ?');
  const result = stmt.run(cutoff);
  return result.changes;
}

// Note: initializeSettingsTables() is called by initializeDatabase() in index.ts
// Do not call it here to avoid circular dependency issues
