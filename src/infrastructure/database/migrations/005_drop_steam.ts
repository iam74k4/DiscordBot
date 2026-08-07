import { database } from '../connection.js';

/**
 * Drop legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot;
 * this migration removes the unused tables on existing databases. Migrations
 * 001 and 002 are kept untouched so that fresh installs and existing
 * deployments converge on the same end state.
 */
export function up(): void {
  database.exec(`DROP TABLE IF EXISTS playtime_history`);
  database.exec(`DROP TABLE IF EXISTS user_notification_prefs`);
  database.exec(`DROP TABLE IF EXISTS game_activity_cache`);
  database.exec(`DROP TABLE IF EXISTS notification_settings`);
  database.exec(`DROP TABLE IF EXISTS steam_users`);
}
