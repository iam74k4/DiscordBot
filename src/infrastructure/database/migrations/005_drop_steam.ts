import { database } from '../connection.js';

const LEGACY_STEAM_TABLES = [
  ['playtime_history', 'legacy_playtime_history'],
  ['user_notification_prefs', 'legacy_user_notification_prefs'],
  ['game_activity_cache', 'legacy_game_activity_cache'],
  ['notification_settings', 'legacy_notification_settings'],
  ['steam_users', 'legacy_steam_users'],
] as const;

function tableExists(tableName: string): boolean {
  const row = database
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    )
    .get(tableName);
  return row !== undefined;
}

function archiveAndDropTable(
  tableName: string,
  archiveTableName: string
): void {
  if (!tableExists(tableName)) {
    return;
  }

  if (!tableExists(archiveTableName)) {
    database.exec(`ALTER TABLE ${tableName} RENAME TO ${archiveTableName}`);
    return;
  }

  database.exec(
    `INSERT OR IGNORE INTO ${archiveTableName} SELECT * FROM ${tableName}`
  );
  database.exec(`DROP TABLE ${tableName}`);
}

/**
 * Archive legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts, then remove the old table names from the active schema.
 * Migrations 001 and 002 are kept untouched so fresh installs and existing
 * deployments converge without silently destroying historical Steam data.
 */
export function up(): void {
  for (const [tableName, archiveTableName] of LEGACY_STEAM_TABLES) {
    archiveAndDropTable(tableName, archiveTableName);
  }
}
