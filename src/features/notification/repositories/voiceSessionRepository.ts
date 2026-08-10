import { database } from '../../../infrastructure/database/connection.js';
import { runTransaction } from '../../../infrastructure/database/transaction.js';

interface VoiceSessionRecord {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string;
  channel_name: string;
  joined_at: number;
  left_at: number | null;
  duration_ms: number | null;
  created_at: number;
}

export interface ChannelStats {
  channel_id: string;
  channel_name: string;
  total_duration_ms: number;
  session_count: number;
}

function startSession(
  guildId: string,
  userId: string,
  channelId: string,
  channelName: string
): number {
  const now = Date.now();
  const stmt = database.prepare(
    'INSERT INTO voice_sessions (guild_id, user_id, channel_id, channel_name, joined_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(guildId, userId, channelId, channelName, now, now);
  return Number(result.lastInsertRowid);
}

/**
 * Calendar day a timestamp falls in, in the process timezone.
 *
 * The rollup is keyed by this, and `getPeriodSince` derives its cutoffs the
 * same way, so both sides agree on where "today" starts. `TZ` defaults to UTC.
 */
export function dayKey(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Close a session and fold its duration into the daily rollup.
 *
 * Both steps run in one transaction: a session counted in `voice_sessions` but
 * missing from the rollup would silently vanish from stats once retention
 * deleted the raw row.
 */
function endSession(sessionId: number): void {
  const now = Date.now();

  runTransaction(() => {
    const closed = database
      .prepare(
        'UPDATE voice_sessions SET left_at = ?, duration_ms = ? - joined_at WHERE id = ? AND left_at IS NULL'
      )
      .run(now, now, sessionId);

    // Already closed by a stale-session sweep or a duplicate end: its duration
    // is either counted or deliberately zero, so adding it again would inflate.
    if (closed.changes !== 1) return;

    const session = database
      .prepare(
        'SELECT guild_id, user_id, channel_id, channel_name, joined_at, duration_ms FROM voice_sessions WHERE id = ?'
      )
      .get(sessionId) as VoiceSessionRecord | undefined;

    if (!session?.duration_ms || session.duration_ms <= 0) return;

    database
      .prepare(
        `INSERT INTO voice_daily_stats (
           guild_id, user_id, channel_id, channel_name, day,
           total_duration_ms, session_count, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(guild_id, user_id, channel_id, day) DO UPDATE SET
           total_duration_ms = total_duration_ms + excluded.total_duration_ms,
           session_count = session_count + 1,
           channel_name = excluded.channel_name,
           updated_at = excluded.updated_at`
      )
      .run(
        session.guild_id,
        session.user_id,
        session.channel_id,
        session.channel_name,
        dayKey(session.joined_at),
        session.duration_ms,
        now
      );
  });
}

function closeStaleSessionsForGuild(guildId: string): number {
  // Crash / hard-kill leftovers have no trustworthy end time. Attribute zero
  // duration instead of charging the entire offline window to the user.
  const stmt = database.prepare(
    'UPDATE voice_sessions SET left_at = joined_at, duration_ms = 0 WHERE guild_id = ? AND left_at IS NULL'
  );
  const result = stmt.run(guildId);
  return result.changes;
}

function closeAllStaleSessions(): number {
  // Crash / hard-kill leftovers have no trustworthy end time. Attribute zero
  // duration instead of charging the entire offline window to the user.
  const stmt = database.prepare(
    'UPDATE voice_sessions SET left_at = joined_at, duration_ms = 0 WHERE left_at IS NULL'
  );
  const result = stmt.run();
  return result.changes;
}

function cleanupOldSessions(daysToKeep: number): number {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const stmt = database.prepare(
    'DELETE FROM voice_sessions WHERE left_at IS NOT NULL AND left_at < ?'
  );
  const result = stmt.run(cutoffTime);
  return result.changes;
}

/**
 * Stats read the rollup, never the raw sessions.
 *
 * Two consequences worth knowing: totals now cover the bot's whole history
 * rather than stopping at `VOICE_SESSION_RETENTION_DAYS`, and a `since` cutoff
 * is rounded down to the start of its day, because a day is the finest bucket
 * the rollup keeps.
 */
function statsFilter(
  guildId: string,
  userId: string,
  since?: number
): { where: string; params: (string | number)[] } {
  const params: (string | number)[] = [guildId, userId];
  let where = 'WHERE guild_id = ? AND user_id = ?';

  if (since !== undefined) {
    where += ' AND day >= ?';
    params.push(dayKey(since));
  }

  return { where, params };
}

function getUserChannelStats(
  guildId: string,
  userId: string,
  since?: number
): ChannelStats[] {
  const { where, params } = statsFilter(guildId, userId, since);

  const stmt = database.prepare(`
    SELECT
      channel_id,
      channel_name,
      SUM(total_duration_ms) as total_duration_ms,
      SUM(session_count) as session_count
    FROM voice_daily_stats
    ${where}
    GROUP BY channel_id
    ORDER BY total_duration_ms DESC
  `);

  return stmt.all(...params) as ChannelStats[];
}

function getUserTotalDuration(
  guildId: string,
  userId: string,
  since?: number
): number {
  const { where, params } = statsFilter(guildId, userId, since);

  const stmt = database.prepare(`
    SELECT COALESCE(SUM(total_duration_ms), 0) as total
    FROM voice_daily_stats
    ${where}
  `);

  const row = stmt.get(...params) as { total: number };
  return row.total;
}

export const voiceSessionRepository = {
  cleanupOldSessions,
  startSession,
  endSession,
  closeStaleSessionsForGuild,
  closeAllStaleSessions,
  getUserChannelStats,
  getUserTotalDuration,
};
