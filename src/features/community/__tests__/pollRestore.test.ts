import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';

const listAll = vi.hoisted(() => vi.fn());
const endPoll = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../poll/pollRepository.js', () => ({
  pollRepository: {
    listAll,
    create: vi.fn(),
    remove: vi.fn(),
    upsertVote: vi.fn(),
  },
}));

vi.mock('../poll/pollService.js', () => ({ endPoll }));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

const { restorePolls } = await import('../poll/restore.js');
const { pollStore } = await import('../poll/pollStore.js');

const client = {} as Client;

function storedPoll(overrides: Record<string, unknown> = {}) {
  return {
    messageId: 'msg-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    creatorId: 'creator-1',
    question: 'Lunch?',
    options: ['Ramen', 'Curry'],
    anonymous: false,
    endsAt: null,
    locale: 'ja',
    votes: new Map([['user-1', 1]]),
    ...overrides,
  };
}

describe('restorePolls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    pollStore.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('brings back the tally so votes are not silently lost on deploy', async () => {
    listAll.mockReturnValue([storedPoll()]);

    await restorePolls(client);

    const poll = pollStore.get('msg-1');
    expect(poll).toBeDefined();
    expect(poll?.question).toBe('Lunch?');
    expect(poll?.votes.get('user-1')).toBe(1);
    expect(poll?.client).toBe(client);
  });

  it('closes polls whose deadline passed while the bot was down', async () => {
    listAll.mockReturnValue([storedPoll({ endsAt: 999_000 })]);

    await restorePolls(client);

    expect(endPoll).toHaveBeenCalledWith('msg-1', client);
  });

  it('re-arms the auto-close timer for polls still running', async () => {
    listAll.mockReturnValue([storedPoll({ endsAt: 1_060_000 })]);

    await restorePolls(client);
    expect(endPoll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(endPoll).toHaveBeenCalledWith('msg-1', client);
  });

  it('leaves polls without a deadline open', async () => {
    listAll.mockReturnValue([storedPoll()]);

    await restorePolls(client);
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(endPoll).not.toHaveBeenCalled();
    expect(pollStore.has('msg-1')).toBe(true);
  });

  it('starts clean when the database cannot be read', async () => {
    listAll.mockImplementation(() => {
      throw new Error('no such table: polls');
    });

    await expect(restorePolls(client)).resolves.toBeUndefined();
    expect(pollStore.size).toBe(0);
  });
});
