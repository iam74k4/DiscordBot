/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from runtime, but
 * existing link/playtime data may still be needed for export or rollback.
 *
 * Migrations are replayed on every fresh process start, so this must remain
 * non-destructive.
 */
export function up(): void {
  // Intentionally no-op.
}
