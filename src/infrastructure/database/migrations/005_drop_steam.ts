/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The runtime Steam feature has been removed from the
 * bot, but deployments may still need the historical data for export,
 * rollback, or manual recovery.
 */
export function up(): void {
  // Intentionally no-op: dropping these tables would erase existing user data
  // during startup because migrations are re-run against deployed databases.
}
