import { database } from '../../../infrastructure/database/connection.js';

export interface VoiceSessionRecord {
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

function endSession(sessionId: number): void {
  const now = Date.now();
  const stmt = database.prepare(
    'UPDATE voice_sessions SET left_at = ?, duration_ms = ? - joined_at WHERE id = ? AND left_at IS NULL'
  );
  stmt.run(now, now, sessionId);
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

function getUserChannelStats(
  guildId: string,
  userId: string,
  since?: number
): ChannelStats[] {
  const params: (string | number)[] = [guildId, userId];
  let whereClause =
    'WHERE guild_id = ? AND user_id = ? AND duration_ms IS NOT NULL';

  if (since !== undefined) {
    whereClause += ' AND joined_at >= ?';
    params.push(since);
  }

  const stmt = database.prepare(`
    SELECT
      channel_id,
      channel_name,
      SUM(duration_ms) as total_duration_ms,
      COUNT(*) as session_count
    FROM voice_sessions
    ${whereClause}
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
  const params: (string | number)[] = [guildId, userId];
  let whereClause =
    'WHERE guild_id = ? AND user_id = ? AND duration_ms IS NOT NULL';

  if (since !== undefined) {
    whereClause += ' AND joined_at >= ?';
    params.push(since);
  }

  const stmt = database.prepare(`
    SELECT COALESCE(SUM(duration_ms), 0) as total
    FROM voice_sessions
    ${whereClause}
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
