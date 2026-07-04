/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * existing data must remain available for export or rollback.
 */
export function up(): void {
  // Intentionally no-op.
}
