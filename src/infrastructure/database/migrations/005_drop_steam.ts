/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The runtime feature has been removed, but existing
 * deployments may still need their Steam link/playtime data for export or
 * rollback.
 */
export function up(): void {
  // Intentionally no-op: do not drop persisted user data during startup.
}
