import { database } from '../connection.js';

/**
 * Preserve legacy Steam-related tables introduced by 001_steam.ts and
 * 002_notifications.ts. Migrations are replayed on database initialization
 * without a persisted migration ledger, so destructive cleanup here would erase
 * historical Steam data on startup.
 */
export function up(): void {
  void database;
}
