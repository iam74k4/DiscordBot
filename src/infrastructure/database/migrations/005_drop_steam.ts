/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The runtime feature has been removed, but migrations
 * are replayed on startup without a persisted ledger, so destructive cleanup
 * here would delete historical Steam data from existing deployments.
 */
export function up(): void {
  // Intentionally no-op: legacy data remains available for export or rollback.
}
