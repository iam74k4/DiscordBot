/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * existing deployments may still need this historical data for export or
 * rollback. Because migrations are replayed at startup rather than tracked in a
 * migration ledger, this migration must remain non-destructive.
 */
export function up(): void {
  // Intentionally left blank: do not drop legacy Steam data on startup.
}
