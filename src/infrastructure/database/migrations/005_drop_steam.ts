import { database } from '../connection.js';

/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam feature has been removed from the bot runtime, but deleting these
 * tables during startup would irreversibly erase user linkage and playtime
 * history before operators have a chance to export or back up the data.
 */
export function up(): void {
  database.exec(`SELECT 1`);
}
