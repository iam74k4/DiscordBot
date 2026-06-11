/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The runtime feature has been removed, but existing
 * deployments may still need the data for export, rollback, or manual recovery.
 */
export function up(): void {
  // Intentionally no-op: do not destroy persisted user data during startup.
}
