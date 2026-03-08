import {
  getAuditChannel,
  getAuditLogs,
  getAuditLogsCount,
  getGuildSettings,
  setAuditChannel,
  setGuildSettings,
  type AuditAction,
  type AuditLogRecord,
  type GuildSettingsRecord,
} from '../../../services/database/settings.js';

export type { AuditAction, AuditLogRecord, GuildSettingsRecord };

export const settingsRepository = {
  getAuditChannel,
  getAuditLogs,
  getAuditLogsCount,
  getGuildSettings,
  setAuditChannel,
  setGuildSettings,
};
