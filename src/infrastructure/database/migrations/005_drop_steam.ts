/**
 * Legacy Steam tables introduced by 001_steam.ts and 002_notifications.ts are
 * no longer used by runtime code, but they may contain user-owned account,
 * playtime, and notification history. Keep this migration as a no-op so
 * existing databases preserve that data for export, audit, or rollback.
 */
export function up(): void {}
