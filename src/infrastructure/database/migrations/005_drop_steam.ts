/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * migrations are rerun on startup and there is no migration ledger. Dropping
 * these tables here would delete existing user data during deployment.
 */
export function up(): void {
  // Intentionally no-op: keep legacy Steam data available for export/rollback.
}
