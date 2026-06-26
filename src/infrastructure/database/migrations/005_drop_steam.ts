/**
 * Drop legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * those tables can contain user links, playtime history, and notification
 * preferences from existing deployments. Keep the migration as an explicit
 * no-op so startup never destroys legacy data that may be exported or restored.
 */
export function up(): void {
  // Intentionally empty: preserve legacy Steam tables for export/rollback.
}
