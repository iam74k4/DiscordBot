/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam runtime feature has been removed from the
 * bot, but existing deployments may still need this data for export, rollback,
 * or manual recovery.
 */
export function up(): void {
  return;
}
