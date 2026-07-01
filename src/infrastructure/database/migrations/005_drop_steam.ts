/**
 * Legacy Steam cleanup marker.
 *
 * Migrations are replayed on every process start because there is no persisted
 * migration ledger. Keep this non-destructive so existing Steam/export data is
 * preserved even after the feature has been removed from runtime code.
 */
export function up(): void {
  // Intentionally no-op.
}
