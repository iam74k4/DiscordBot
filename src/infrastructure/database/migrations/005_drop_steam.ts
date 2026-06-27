/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam runtime feature has been removed, but existing deployments may
 * still contain user Steam IDs, playtime history, and notification settings.
 * Migrations run automatically on startup, so dropping these tables here would
 * irreversibly delete user data before operators have a chance to export it or
 * roll back.
 */
export function up(): void {
  // Intentionally no-op: keep legacy data available for export/rollback.
}
