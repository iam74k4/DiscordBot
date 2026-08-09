import { database } from '../connection.js';

/**
 * Polls survive restarts. Before this, an active poll lived only in process
 * memory: a deploy silently dropped the tally and its auto-close timer while
 * the message kept showing a live-looking embed with working buttons.
 */
export function up(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      anonymous INTEGER NOT NULL DEFAULT 0,
      ends_at INTEGER,
      locale TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      ended INTEGER NOT NULL DEFAULT 0
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      voted_at INTEGER NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES polls(message_id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_polls_guild_id
    ON polls(guild_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_polls_ends_at
    ON polls(ends_at)
  `);
}
