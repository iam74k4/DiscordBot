import { database } from '../../../infrastructure/database/connection.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

/**
 * Where a user's running poll lives.
 *
 * Discord owns the poll itself - the question, the answers, who voted, and
 * when it closes. All the bot needs to keep is enough to answer "which message
 * is this user's poll in this channel", which is what `/community poll end`
 * asks. Nothing here is authoritative; losing a row costs the creator the
 * shortcut, not the poll.
 */
export interface PollRecord {
  message_id: string;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  expires_at: number;
  created_at: number;
}

function create(record: Omit<PollRecord, 'created_at'>): void {
  database
    .prepare(
      `INSERT OR REPLACE INTO polls
         (message_id, guild_id, channel_id, creator_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.message_id,
      record.guild_id,
      record.channel_id,
      record.creator_id,
      record.expires_at,
      Date.now()
    );
}

/** The creator's most recent poll in this channel that has not expired. */
function findActiveByCreator(
  creatorId: string,
  channelId: string
): PollRecord | null {
  const row = database
    .prepare(
      `SELECT * FROM polls
       WHERE creator_id = ? AND channel_id = ? AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(creatorId, channelId, Date.now()) as PollRecord | undefined;

  return row ?? null;
}

function remove(messageId: string): void {
  database.prepare('DELETE FROM polls WHERE message_id = ?').run(messageId);
}

/**
 * Forget polls Discord has already closed. Purely housekeeping - an expired
 * row is never returned by `findActiveByCreator`.
 */
function removeExpired(): number {
  try {
    return database
      .prepare('DELETE FROM polls WHERE expires_at <= ?')
      .run(Date.now()).changes;
  } catch (error) {
    logger.warn(`Failed to prune expired polls: ${getErrorMessage(error)}`);
    return 0;
  }
}

export const pollRepository = {
  create,
  findActiveByCreator,
  remove,
  removeExpired,
};
