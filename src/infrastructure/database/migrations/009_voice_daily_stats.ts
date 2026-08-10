import { database } from '../connection.js';

/**
 * Daily rollup of voice time.
 *
 * `/notification stats` used to sum raw `voice_sessions` rows, which meant two
 * things: the cost of "all time" grew with every session ever recorded, and
 * "all time" quietly meant "the last VOICE_SESSION_RETENTION_DAYS" because the
 * cleanup job deletes the rows it was summing. One row per user, channel, and
 * day fixes both - totals survive retention and a query touches days, not
 * sessions.
 */
export function up(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS voice_daily_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      day TEXT NOT NULL,
      total_duration_ms INTEGER NOT NULL,
      session_count INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, channel_id, day)
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_voice_daily_stats_lookup
    ON voice_daily_stats (guild_id, user_id, day)
  `);

  backfillFromSessions();
}

/**
 * Seed the rollup from whatever history a database already has, so upgrading
 * does not look like everyone's stats were reset.
 *
 * Guarded on the table being empty because migrations re-run on every boot and
 * this would otherwise double-count. From here on `endSession` maintains the
 * rollup incrementally.
 *
 * Day boundaries here are UTC (SQLite's `date()`); the running bot uses the
 * process timezone, which `TZ` defaults to UTC. A deployment that sets `TZ`
 * elsewhere gets backfilled history bucketed a few hours off - only for
 * sessions that predate this migration.
 */
function backfillFromSessions(): void {
  const existing = database
    .prepare('SELECT COUNT(*) as count FROM voice_daily_stats')
    .get() as { count: number };
  if (existing.count > 0) return;

  database
    .prepare(
      `INSERT INTO voice_daily_stats (
         guild_id, user_id, channel_id, channel_name, day,
         total_duration_ms, session_count, updated_at
       )
       SELECT
         guild_id,
         user_id,
         channel_id,
         MAX(channel_name),
         date(joined_at / 1000, 'unixepoch'),
         SUM(duration_ms),
         COUNT(*),
         ?
       FROM voice_sessions
       WHERE duration_ms IS NOT NULL AND duration_ms > 0
       GROUP BY guild_id, user_id, channel_id, date(joined_at / 1000, 'unixepoch')`
    )
    .run(Date.now());
}
