/**
 * Legacy Steam data must remain available for backup/export/rollback even
 * after the runtime feature is removed. Keep this migration as an explicit
 * no-op so existing databases are never destructively rewritten on startup.
 */
export function up(): void {
  // Intentionally empty.
}
