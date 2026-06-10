/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam runtime feature has been removed, but the
 * persisted data may still be needed for export or rollback on existing
 * deployments.
 */
export function up(): void {
  // Intentionally no-op: migrations run on every startup in this project, so
  // destructive cleanup here would delete historical user data at boot.
}
