import { database } from '../../../infrastructure/database/connection.js';
import { steamUserRepository } from '../../steam/repositories/steamUserRepository.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

const ALLOWED_TABLES = new Set([
  'steam_users',
  'playtime_history',
  'game_activity_cache',
  'guild_settings',
  'notification_settings',
  'user_notification_prefs',
  'audit_logs',
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
  getRegisteredUsersCount: () => steamUserRepository.getCount(),
  getTableRowCount,
};
