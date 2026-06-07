/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature has been removed from the bot, but
 * existing databases may still contain user-linked Steam profiles, playtime
 * history, and notification preferences that operators need for export or
 * rollback.
 */
export function up(): void {}
