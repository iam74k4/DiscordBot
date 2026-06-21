import { database } from '../connection.js';

/**
 * Keep legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. The Steam feature is no longer used at runtime, but
 * existing deployments may still need this data for export or rollback.
 */
export function up(): void {
  // No-op migration kept as a marker for the Steam feature removal.
  void database;
}
