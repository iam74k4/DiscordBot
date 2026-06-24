/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam feature is no longer active, but existing deployments may still
 * need the historical data for export or rollback. Keep this migration
 * intentionally non-destructive so startup never deletes user data.
 */
export function up(): void {
  // Intentionally empty: see migration note above.
}
