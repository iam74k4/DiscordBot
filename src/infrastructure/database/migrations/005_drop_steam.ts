/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * migration execution is not tracked per database and startup replays every
 * migration once per process. Dropping here would delete existing user data.
 */
export function up(): void {
  // Intentionally no-op: legacy data must remain available for export/rollback.
}
