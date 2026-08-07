import { database } from '../../../infrastructure/database/connection.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

const ALLOWED_TABLES = new Set([
  'guild_settings',
  'audit_logs',
  'notification_channels',
  'voice_sessions',
]);

/**
 * @param tableName Table name (must be in whitelist)
 * @returns Row count or null if table not allowed or doesn't exist
 */
function getTableRowCount(tableName: string): number | null {
  if (!ALLOWED_TABLES.has(tableName)) {
    return null;
  }

  try {
    const stmt = database.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const result = stmt.get() as { count: number } | undefined;
    return result?.count ?? null;
  } catch (error) {
    logger.warn(
      `getTableRowCount failed for ${tableName}: ${getErrorMessage(error)}`
    );
    return null;
  }
}

export const databaseStatsRepository = {
  getTableRowCount,
};
