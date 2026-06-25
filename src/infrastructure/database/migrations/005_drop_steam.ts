/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * these tables may contain user-linked accounts, playtime history, and
 * notification preferences from existing deployments.
 */
export function up(): void {
  // Intentionally no-op: keeping this migration prevents future reuse of the
  // 005 prefix while avoiding destructive startup-time schema changes.
}
