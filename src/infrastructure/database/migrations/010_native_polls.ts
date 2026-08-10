import { database } from '../connection.js';

/**
 * Reshape poll storage for Discord's native polls.
 *
 * Votes, options, and deadlines used to live here because the bot rendered the
 * poll itself with buttons. Discord now owns all of that, so the only thing
 * worth storing is the pointer `/community poll end` needs: which message a
 * user's poll is, and when it stops being endable.
 *
 * Any custom poll still open at upgrade time loses its buttons - nothing
 * handles them any more. Its message stays in the channel showing the last
 * tally the bot published.
 */
function columnNames(table: string): string[] {
  const columns = database.pragma(`table_info(${table})`) as Array<{
    name: string;
  }>;
  return columns.map((column) => column.name);
}

export function up(): void {
  // Never recreated, so an unconditional drop is safe on every boot.
  database.exec('DROP TABLE IF EXISTS poll_votes');

  // Guarded on the old schema: migrations re-run at every startup, and an
  // unconditional drop would wipe live polls on each restart.
  if (columnNames('polls').includes('question')) {
    database.exec('DROP TABLE polls');
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_polls_creator
    ON polls (creator_id, channel_id)
  `);
}
