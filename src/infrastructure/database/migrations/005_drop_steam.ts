/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts intact. The Steam runtime feature has been removed, but
 * existing data must remain available for export, rollback, and operator-led
 * cleanup.
 */
export function up(): void {}
