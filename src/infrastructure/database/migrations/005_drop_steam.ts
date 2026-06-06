/**
 * Keep legacy Steam-related tables intact.
 *
 * The Steam feature was removed from runtime code, but existing deployments may
 * still need historical Steam data for export, rollback, or manual recovery.
 * Migrations are replayed on startup without a persisted ledger, so this file
 * must remain non-destructive.
 */
export function up(): void {
  // Intentionally no-op.
}
