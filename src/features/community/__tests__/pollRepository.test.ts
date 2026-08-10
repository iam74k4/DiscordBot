import Database from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The pointer table is all that survives the move to native polls, and its one
 * job is answering "which message is this user's open poll here". These run
 * against real SQLite because the interesting parts are the query predicates.
 */
const db = new Database(':memory:');

vi.mock('../../../infrastructure/database/connection.js', () => ({
  database: db,
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

const { pollRepository } = await import('../poll/pollRepository.js');
const { up: nativePolls } =
  await import('../../../infrastructure/database/migrations/010_native_polls.js');

const HOUR = 60 * 60 * 1000;

function record(
  overrides: Partial<Parameters<typeof pollRepository.create>[0]>
) {
  return {
    message_id: 'msg-1',
    guild_id: 'guild-1',
    channel_id: 'chan-1',
    creator_id: 'user-1',
    expires_at: Date.now() + HOUR,
    ...overrides,
  };
}

describe('pollRepository', () => {
  beforeEach(() => {
    db.exec('DROP TABLE IF EXISTS polls');
    nativePolls();
  });

  it("finds the creator's own poll in this channel", () => {
    pollRepository.create(record({}));

    expect(
      pollRepository.findActiveByCreator('user-1', 'chan-1')?.message_id
    ).toBe('msg-1');
  });

  it('does not hand a poll to another user or another channel', () => {
    pollRepository.create(record({}));

    expect(pollRepository.findActiveByCreator('user-2', 'chan-1')).toBeNull();
    expect(pollRepository.findActiveByCreator('user-1', 'chan-2')).toBeNull();
  });

  it('ignores a poll Discord has already closed', () => {
    pollRepository.create(record({ expires_at: Date.now() - 1 }));

    expect(pollRepository.findActiveByCreator('user-1', 'chan-1')).toBeNull();
  });

  it('returns the most recent poll when a user has several open', () => {
    vi.useFakeTimers();
    pollRepository.create(record({ message_id: 'older' }));
    vi.advanceTimersByTime(1_000);
    pollRepository.create(record({ message_id: 'newer' }));
    vi.useRealTimers();

    expect(
      pollRepository.findActiveByCreator('user-1', 'chan-1')?.message_id
    ).toBe('newer');
  });

  it('prunes only expired rows', () => {
    pollRepository.create(record({ message_id: 'live' }));
    pollRepository.create(
      record({ message_id: 'stale', expires_at: Date.now() - 1 })
    );

    expect(pollRepository.removeExpired()).toBe(1);
    expect(
      pollRepository.findActiveByCreator('user-1', 'chan-1')?.message_id
    ).toBe('live');
  });
});

describe('native poll migration', () => {
  it('replaces the custom poll schema exactly once', () => {
    db.exec('DROP TABLE IF EXISTS polls');
    // A database still carrying the button-era schema, with a live poll in it.
    db.exec(`
      CREATE TABLE polls (
        message_id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        options TEXT NOT NULL
      )
    `);
    db.exec(`
      CREATE TABLE poll_votes (message_id TEXT, user_id TEXT, option_index INTEGER)
    `);
    db.prepare('INSERT INTO polls VALUES (?, ?, ?)').run(
      'old',
      'Lunch?',
      '["a","b"]'
    );

    nativePolls();
    pollRepository.create(record({ message_id: 'kept' }));
    // Re-running on every boot must not wipe what the first run created.
    nativePolls();
    nativePolls();

    expect(
      pollRepository.findActiveByCreator('user-1', 'chan-1')?.message_id
    ).toBe('kept');
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='poll_votes'"
        )
        .get()
    ).toBeUndefined();
  });
});

afterAll(() => {
  db.close();
});
