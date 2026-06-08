/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * Migrations are replayed during startup and are not tracked in a schema
 * ledger. Dropping these tables here would delete existing Steam profile and
 * playtime history data as soon as an upgraded bot starts. The runtime no
 * longer uses these tables, but keeping them is safe and lets operators export
 * or roll back legacy data if needed.
 */
export function up(): void {
  // Intentionally no-op.
}
