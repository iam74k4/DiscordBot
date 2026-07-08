/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from runtime scope,
 * but existing data is intentionally retained for export/rollback.
 */
export function up(): void {
  // Intentionally no-op.
}
