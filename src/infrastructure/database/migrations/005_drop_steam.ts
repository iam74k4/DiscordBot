import { database } from '../connection.js';

/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The runtime feature was removed, but those tables can
 * still contain user-linked Steam accounts, playtime history, and notification
 * settings that operators may need to export or recover.
 */
export function up(): void {
  // Intentionally non-destructive: migration files run on startup without a
  // persisted migration ledger, so DROP statements here would erase production
  // data as soon as a bot with this migration starts.
  database.exec(`SELECT 1`);
}
