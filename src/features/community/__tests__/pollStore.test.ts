import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const upsertVote = vi.hoisted(() => vi.fn());
const markEnded = vi.hoisted(() => vi.fn());

vi.mock('../poll/pollRepository.js', () => ({
  pollRepository: { create, remove, upsertVote, markEnded },
}));

const { MAX_ACTIVE_POLLS, MAX_ACTIVE_POLLS_PER_GUILD, pollStore } =
  await import('../poll/pollStore.js');
type PollData = import('../poll/pollStore.js').PollData;

describe('PollStore', () => {
  const createMockPoll = (id: string, guildId = 'guild123'): PollData => ({
    question: `Test question ${id}`,
    options: ['Option A', 'Option B', 'Option C'],
    votes: new Map(),
    creatorId: 'creator123',
    anonymous: false,
    channelId: 'channel123',
    guildId,
    locale: 'en',
  });

  beforeEach(() => {
    pollStore.clearAll();
    vi.clearAllMocks();
  });

  it('stores and retrieves a poll', () => {
    const poll = createMockPoll('1');
    pollStore.set('msg1', poll);

    const retrieved = pollStore.get('msg1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.question).toBe('Test question 1');
  });

  it('tracks existence and size correctly', () => {
    expect(pollStore.size).toBe(0);
    expect(pollStore.has('msg1')).toBe(false);

    pollStore.set('msg1', createMockPoll('1'));
    pollStore.set('msg2', createMockPoll('2'));

    expect(pollStore.has('msg1')).toBe(true);
    expect(pollStore.size).toBe(2);
  });

  it('clears timeouts when deleting a poll', () => {
    const poll = createMockPoll('1');
    poll.timeout = setTimeout(() => {}, 10000);

    pollStore.set('msg1', poll);
    expect(pollStore.delete('msg1')).toBe(true);
    expect(pollStore.has('msg1')).toBe(false);
  });

  it('enforces the global active poll limit across guilds', () => {
    // Spread across guilds so the per-guild cap is not what stops us.
    for (let i = 0; i < MAX_ACTIVE_POLLS; i++) {
      pollStore.set(
        `msg${i}`,
        createMockPoll(String(i), `guild${Math.floor(i / 10)}`)
      );
    }

    expect(pollStore.canCreate('fresh-guild')).toBe(false);
    expect(() =>
      pollStore.set('overflow', createMockPoll('overflow', 'fresh-guild'))
    ).toThrow(`Active poll limit reached (${MAX_ACTIVE_POLLS})`);
  });

  it('stops one guild from filling the global budget', () => {
    for (let i = 0; i < MAX_ACTIVE_POLLS_PER_GUILD; i++) {
      pollStore.set(`noisy${i}`, createMockPoll(String(i), 'noisy-guild'));
    }

    expect(pollStore.countForGuild('noisy-guild')).toBe(
      MAX_ACTIVE_POLLS_PER_GUILD
    );
    expect(pollStore.canCreate('noisy-guild')).toBe(false);
    // Other guilds are unaffected.
    expect(pollStore.canCreate('quiet-guild')).toBe(true);
  });

  describe('persistence', () => {
    it('writes a new poll out so a restart can restore it', () => {
      pollStore.set('msg1', createMockPoll('1'));

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg1',
          guildId: 'guild123',
          question: 'Test question 1',
          options: ['Option A', 'Option B', 'Option C'],
        })
      );
    });

    it('writes each vote out as it is cast', () => {
      pollStore.set('msg1', createMockPoll('1'));
      expect(pollStore.setVote('msg1', 'user-1', 2)).toBe(true);

      expect(pollStore.get('msg1')?.votes.get('user-1')).toBe(2);
      expect(upsertVote).toHaveBeenCalledWith('msg1', 'user-1', 2);
    });

    it('does not keep a vote in memory when persistence fails', () => {
      pollStore.set('msg1', createMockPoll('1'));
      upsertVote.mockImplementationOnce(() => {
        throw new Error('database is locked');
      });

      expect(pollStore.setVote('msg1', 'user-1', 1)).toBe(false);
      expect(pollStore.get('msg1')?.votes.has('user-1')).toBe(false);
    });

    it('persists ended so restart cannot reopen voting', () => {
      pollStore.set('msg1', createMockPoll('1'));
      pollStore.markEnded('msg1');

      expect(pollStore.get('msg1')?.ended).toBe(true);
      expect(markEnded).toHaveBeenCalledWith('msg1');
    });

    it('ignores votes for polls it does not hold', () => {
      expect(pollStore.setVote('missing', 'user-1', 0)).toBe(false);
      expect(upsertVote).not.toHaveBeenCalled();
    });

    it('deletes stored rows when a poll is finalized', () => {
      pollStore.set('msg1', createMockPoll('1'));
      pollStore.delete('msg1');

      expect(remove).toHaveBeenCalledWith('msg1');
    });

    it('keeps stored polls on shutdown so they can be restored', () => {
      pollStore.set('msg1', createMockPoll('1'));
      pollStore.set('msg2', createMockPoll('2'));

      pollStore.clearAll();

      expect(pollStore.size).toBe(0);
      expect(pollStore.has('msg1')).toBe(false);
      // clearAll is shutdown, not cancellation: the rows must survive.
      expect(remove).not.toHaveBeenCalled();
    });

    it('restores without rewriting or counting against creation limits', () => {
      pollStore.restore('msg1', createMockPoll('1'));

      expect(pollStore.has('msg1')).toBe(true);
      expect(create).not.toHaveBeenCalled();
    });

    it('survives a database that rejects the write', () => {
      create.mockImplementationOnce(() => {
        throw new Error('database is locked');
      });

      expect(() => pollStore.set('msg1', createMockPoll('1'))).not.toThrow();
      expect(pollStore.has('msg1')).toBe(true);
    });
  });
});
