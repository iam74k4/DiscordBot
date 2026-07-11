/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * migrations currently run on every startup and there is no migration ledger.
 * Dropping these tables here would erase existing user data during deploys.
 */
export function up(): void {
  // Intentionally no-op: keep legacy data available for export or rollback.
}
