import { database } from '../../../infrastructure/database/connection.js';
import { runTransaction } from '../../../infrastructure/database/transaction.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import type { Locale } from '../../../locales/index.js';

export interface PollRecord {
  message_id: string;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  question: string;
  /** JSON array of option labels. */
  options: string;
  anonymous: number;
  ends_at: number | null;
  locale: string;
  created_at: number;
  ended: number;
}

export interface PollVoteRecord {
  message_id: string;
  user_id: string;
  option_index: number;
}

export interface PersistedPoll {
  messageId: string;
  guildId: string;
  channelId: string;
  creatorId: string;
  question: string;
  options: string[];
  anonymous: boolean;
  endsAt: number | null;
  locale: Locale;
  ended: boolean;
  votes: Map<string, number>;
}

function create(poll: {
  messageId: string;
  guildId: string;
  channelId: string;
  creatorId: string;
  question: string;
  options: string[];
  anonymous: boolean;
  endsAt?: number;
  locale: string;
}): void {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO polls (
      message_id, guild_id, channel_id, creator_id, question, options,
      anonymous, ends_at, locale, created_at, ended
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(
    poll.messageId,
    poll.guildId,
    poll.channelId,
    poll.creatorId,
    poll.question,
    JSON.stringify(poll.options),
    poll.anonymous ? 1 : 0,
    poll.endsAt ?? null,
    poll.locale,
    Date.now()
  );
}

function markEnded(messageId: string): void {
  database
    .prepare('UPDATE polls SET ended = 1 WHERE message_id = ?')
    .run(messageId);
}

function remove(messageId: string): void {
  // Votes first, then the poll row — must be atomic so a crash cannot leave a
  // poll row with an empty tally for restore to reopen.
  runTransaction(() => {
    database
      .prepare('DELETE FROM poll_votes WHERE message_id = ?')
      .run(messageId);
    database.prepare('DELETE FROM polls WHERE message_id = ?').run(messageId);
  });
}

function upsertVote(
  messageId: string,
  userId: string,
  optionIndex: number
): void {
  const stmt = database.prepare(`
    INSERT INTO poll_votes (message_id, user_id, option_index, voted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(message_id, user_id)
    DO UPDATE SET option_index = excluded.option_index, voted_at = excluded.voted_at
  `);
  stmt.run(messageId, userId, optionIndex, Date.now());
}

function countForGuild(guildId: string): number {
  const row = database
    .prepare(
      'SELECT COUNT(*) as count FROM polls WHERE guild_id = ? AND ended = 0'
    )
    .get(guildId) as { count: number } | undefined;
  return row?.count ?? 0;
}

/**
 * Every stored poll with its votes, for restoring state at startup.
 * Open polls and finalize-pending (`ended=1`) rows both survive here until
 * Discord publish succeeds and remove() deletes them.
 */
function listAll(): PersistedPoll[] {
  const polls = database
    .prepare('SELECT * FROM polls ORDER BY created_at ASC')
    .all() as PollRecord[];

  if (polls.length === 0) return [];

  const votes = database
    .prepare('SELECT message_id, user_id, option_index FROM poll_votes')
    .all() as PollVoteRecord[];

  const votesByPoll = new Map<string, Map<string, number>>();
  for (const vote of votes) {
    let pollVotes = votesByPoll.get(vote.message_id);
    if (!pollVotes) {
      pollVotes = new Map();
      votesByPoll.set(vote.message_id, pollVotes);
    }
    pollVotes.set(vote.user_id, vote.option_index);
  }

  const restored: PersistedPoll[] = [];
  for (const poll of polls) {
    let options: unknown;
    try {
      options = JSON.parse(poll.options);
    } catch (error) {
      logger.warn(
        `Dropping poll ${poll.message_id} with unreadable options: ${getErrorMessage(error)}`
      );
      continue;
    }

    if (!Array.isArray(options) || options.length < 2) {
      logger.warn(`Dropping poll ${poll.message_id} with invalid options`);
      continue;
    }

    restored.push({
      messageId: poll.message_id,
      guildId: poll.guild_id,
      channelId: poll.channel_id,
      creatorId: poll.creator_id,
      question: poll.question,
      options: options.map(String),
      anonymous: poll.anonymous === 1,
      endsAt: poll.ends_at,
      locale: poll.locale as Locale,
      ended: poll.ended === 1,
      votes: votesByPoll.get(poll.message_id) ?? new Map(),
    });
  }

  return restored;
}

export const pollRepository = {
  countForGuild,
  create,
  listAll,
  markEnded,
  remove,
  upsertVote,
};
