/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature is no longer active, but these
 * tables contain user-owned historical data and notification preferences.
 */
export function up(): void {
  // Intentionally no-op: migrations run at startup without a migration ledger.
}
