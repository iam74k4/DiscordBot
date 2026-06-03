import { database } from '../connection.js';

/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam feature has been removed from runtime command/job discovery, but
 * existing deployments may still need their historical Steam data for backup,
 * export, or rollback. Migrations are replayed at startup in this project, so
 * destructive DDL here would delete that data as soon as the bot boots.
 */
export function up(): void {
  database.exec(`SELECT 1`);
}
