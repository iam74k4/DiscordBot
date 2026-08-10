import { database } from '../connection.js';

/**
 * Per-guild channel for bot-owner announcements.
 *
 * `/owner system broadcast` used to DM every guild owner. Unsolicited DMs are
 * both unreliable (most owners have server DMs closed) and the kind of thing
 * Discord flags, so the announcement now goes to a channel the guild itself
 * nominated. No column means the guild has not opted in and is skipped.
 */
function hasColumn(table: string, column: string): boolean {
  const columns = database.pragma(`table_info(${table})`) as Array<{
    name: string;
  }>;
  return columns.some((c) => c.name === column);
}

export function up(): void {
  // Migrations re-run on every boot, so the ALTER is guarded rather than
  // relying on an IF NOT EXISTS clause SQLite does not have for columns.
  if (!hasColumn('guild_settings', 'announcement_channel_id')) {
    database.exec(`
      ALTER TABLE guild_settings
      ADD COLUMN announcement_channel_id TEXT
    `);
  }
}
