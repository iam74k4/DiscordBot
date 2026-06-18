/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * this project runs every migration on startup without a persisted migration
 * ledger. Dropping these tables here would delete historical data every time
 * an existing deployment boots.
 */
export function up(): void {
  // Intentionally no-op: keep legacy Steam data available for export/rollback.
}
