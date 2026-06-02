import { database } from '../connection.js';

/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * existing deployments may still need the data for export or rollback.
 *
 * Migrations are replayed during startup rather than tracked in a migration
 * ledger, so this migration must remain non-destructive.
 */
export function up(): void {
  database.exec('SELECT 1');
}
