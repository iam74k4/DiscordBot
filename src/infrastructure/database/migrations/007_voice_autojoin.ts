import { database } from '../connection.js';

/**
 * Per-guild control over the voice auto-join that feeds `/voice record`.
 *
 * The bot joins any occupied voice channel and buffers everyone's audio, so
 * servers need a way to keep it out of specific channels (or out entirely)
 * without removing the feature.
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
  if (!hasColumn('guild_settings', 'voice_autojoin_enabled')) {
    database.exec(`
      ALTER TABLE guild_settings
      ADD COLUMN voice_autojoin_enabled INTEGER NOT NULL DEFAULT 1
    `);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS voice_autojoin_exclusions (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    )
  `);
}
