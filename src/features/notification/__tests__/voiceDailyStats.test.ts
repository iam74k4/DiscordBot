import Database from 'better-sqlite3';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/**
 * The rollup is the reason `/notification stats` can still answer "all time"
 * after the cleanup job has deleted the sessions it used to sum. That claim is
 * only true if the write path and the retention path agree, so these run
 * against a real SQLite database rather than a mocked statement recorder.
 */
const db = new Database(':memory:');

vi.mock('../../../infrastructure/database/connection.js', () => ({
  database: db,
}));

vi.mock('../../../infrastructure/database/transaction.js', () => ({
  runTransaction: <T>(fn: () => T): T => db.transaction(fn)(),
}));

const { voiceSessionRepository, dayKey } =
  await import('../repositories/voiceSessionRepository.js');
const { up: createVoiceSessions } =
  await import('../../../infrastructure/database/migrations/004_notification.js');
const { up: createDailyStats } =
  await import('../../../infrastructure/database/migrations/009_voice_daily_stats.js');

const GUILD = 'guild-1';
const USER = 'user-1';

function closedSession(
  channelId: string,
  joinedAt: number,
  durationMs: number
) {
  const id = Number(
    db
      .prepare(
        `INSERT INTO voice_sessions
           (guild_id, user_id, channel_id, channel_name, joined_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(GUILD, USER, channelId, `#${channelId}`, joinedAt, joinedAt)
      .lastInsertRowid
  );
  db.prepare(
    'UPDATE voice_sessions SET left_at = ?, duration_ms = ? WHERE id = ?'
  ).run(joinedAt + durationMs, durationMs, id);
  return id;
}

/** A real visit: the clock has to move, or the session lasts zero ms. */
function recordSession(channelId: string, durationMs: number): number {
  const id = voiceSessionRepository.startSession(
    GUILD,
    USER,
    channelId,
    `#${channelId}`
  );
  vi.advanceTimersByTime(durationMs);
  voiceSessionRepository.endSession(id);
  return id;
}

function rollupRows() {
  return db
    .prepare(
      'SELECT channel_id, day, total_duration_ms, session_count FROM voice_daily_stats ORDER BY day, channel_id'
    )
    .all();
}

describe('voice daily stats rollup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    db.exec('DROP TABLE IF EXISTS voice_sessions');
    db.exec('DROP TABLE IF EXISTS notification_channels');
    db.exec('DROP TABLE IF EXISTS voice_daily_stats');
    createVoiceSessions();
    createDailyStats();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    db.close();
  });

  it('accumulates repeated sessions into one row per channel and day', () => {
    recordSession('vc-a', 60_000);
    recordSession('vc-a', 30_000);

    const rows = rollupRows() as Array<{
      channel_id: string;
      session_count: number;
      total_duration_ms: number;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].channel_id).toBe('vc-a');
    expect(rows[0].session_count).toBe(2);
    expect(rows[0].total_duration_ms).toBe(90_000);
  });

  it('does not count a session twice when it is ended again', () => {
    const id = recordSession('vc-a', 60_000);
    const afterFirst = voiceSessionRepository.getUserTotalDuration(GUILD, USER);

    voiceSessionRepository.endSession(id);

    expect(voiceSessionRepository.getUserTotalDuration(GUILD, USER)).toBe(
      afterFirst
    );
    expect(rollupRows()).toHaveLength(1);
  });

  it('adds nothing for a stale session closed with zero duration', () => {
    voiceSessionRepository.startSession(GUILD, USER, 'vc-a', '#vc-a');
    voiceSessionRepository.closeAllStaleSessions();

    expect(rollupRows()).toHaveLength(0);
    expect(voiceSessionRepository.getUserTotalDuration(GUILD, USER)).toBe(0);
  });

  it('keeps totals after retention deletes the raw sessions', () => {
    recordSession('vc-a', 60_000);
    const before = voiceSessionRepository.getUserTotalDuration(GUILD, USER);

    // Everything closed is now older than a zero-day retention window.
    vi.advanceTimersByTime(1_000);
    voiceSessionRepository.cleanupOldSessions(0);
    expect(
      (
        db.prepare('SELECT COUNT(*) as c FROM voice_sessions').get() as {
          c: number;
        }
      ).c
    ).toBe(0);

    expect(voiceSessionRepository.getUserTotalDuration(GUILD, USER)).toBe(
      before
    );
  });

  it('splits history by day and honours a since cutoff', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    closedSession('vc-a', now - 3 * dayMs, 60_000);
    closedSession('vc-a', now, 30_000);
    // Backfill is what a database upgraded mid-life goes through.
    createDailyStats();

    const rows = rollupRows();
    expect(rows).toHaveLength(2);

    expect(voiceSessionRepository.getUserTotalDuration(GUILD, USER)).toBe(
      90_000
    );
    expect(
      voiceSessionRepository.getUserTotalDuration(GUILD, USER, now - dayMs)
    ).toBe(30_000);
  });

  it('backfills only once, however many boots run the migration', () => {
    closedSession('vc-a', Date.now(), 60_000);

    createDailyStats();
    createDailyStats();
    createDailyStats();

    expect(voiceSessionRepository.getUserTotalDuration(GUILD, USER)).toBe(
      60_000
    );
  });

  it('reports per-channel totals from the rollup', () => {
    recordSession('vc-a', 60_000);
    recordSession('vc-b', 30_000);

    const stats = voiceSessionRepository.getUserChannelStats(GUILD, USER);
    expect(stats.map((s) => s.channel_id).sort()).toEqual(['vc-a', 'vc-b']);
  });

  it('buckets a timestamp by the process timezone', () => {
    const noon = new Date(2026, 0, 15, 12, 0, 0).getTime();
    expect(dayKey(noon)).toBe('2026-01-15');
  });
});
