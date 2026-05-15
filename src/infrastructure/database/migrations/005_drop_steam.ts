/**
 * Steam-related runtime code has been removed, but existing installations may
 * still need historical data for backup/export. Keep this migration as a no-op
 * so migration numbering remains stable without deleting legacy tables.
 */
export function up(): void {
  // Intentionally empty.
}
