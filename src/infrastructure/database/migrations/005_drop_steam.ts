/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * preserving the tables avoids deleting historical user data on startup.
 */
export function up(): void {
  // Intentionally no-op.
}
