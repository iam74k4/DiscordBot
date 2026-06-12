/**
 * Preserve legacy Steam-related tables after the Steam runtime feature was
 * removed. Migration execution is not tracked per database, so any destructive
 * cleanup here would run during normal startup and delete existing user data.
 */
export function up(): void {
  // Intentionally no-op: keep legacy data available for export or rollback.
}
