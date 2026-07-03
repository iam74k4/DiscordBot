import { database } from '../connection.js';

/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts.
 *
 * The Steam feature is no longer active, but existing registrations,
 * playtime history, and notification preferences are user data. Keep this
 * migration intentionally non-destructive so deployments can still export or
 * roll back that data after upgrading.
 */
export function up(): void {
  void database;
}
