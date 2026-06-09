/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam feature has been removed from the bot runtime, but historical
 * Steam account/playtime/notification data belongs to users and may still be
 * needed for export or rollback. Migrations run on every startup in this
 * project, so this migration must remain non-destructive.
 */
export function up(): void {
  // Intentionally no-op.
}
