import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPollButtons,
  buildPollResultEmbed,
  endPoll,
  findUserPollInChannel,
} from '../poll/pollService.js';
import { pollStore, type PollData } from '../poll/pollStore.js';

vi.mock('../../../locales/index.js', () => ({
  t: (key: string, _locale: string, params?: Record<string, number>) => {
    if (key === 'poll.votes') return `${params?.count ?? 0} votes`;
    if (key === 'poll.anonymous') return 'Anonymous';
    if (key === 'poll.endsIn') return `Ends in ${params?.duration ?? 0} min`;
    if (key === 'poll.total') return `Total: ${params?.count ?? 0}`;
    if (key === 'poll.title') return 'Poll';
    if (key === 'poll.ended') return 'Poll Ended';
    return key;
  },
}));

const createPoll = (overrides?: Partial<PollData>): PollData => ({
  question: 'Test?',
  options: ['A', 'B', 'C'],
  votes: new Map(),
  creatorId: 'creator1',
  anonymous: false,
  channelId: 'ch1',
  guildId: 'g1',
  locale: 'en',
  ...overrides,
});

describe('community poll service', () => {
  beforeEach(() => {
    pollStore.clearAll();
  });

  it('builds a poll embed', () => {
    const poll = createPoll();
    const embed = buildPollResultEmbed(poll, false);

    expect(embed.data.title).toBeDefined();
    expect(embed.data.description).toBe('Test?');
    expect(embed.data.fields).toHaveLength(3);
  });

  it('builds buttons across multiple rows', () => {
    const poll = createPoll({
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
    });

    const rows = buildPollButtons(poll, false);
    expect(rows).toHaveLength(2);
  });

  it('finds a user poll in the same channel', () => {
    pollStore.set('msg1', createPoll({ creatorId: 'u1', channelId: 'ch1' }));

    expect(findUserPollInChannel('u1', 'ch1')).toBe('msg1');
    expect(findUserPollInChannel('u2', 'ch1')).toBeNull();
  });

  it('ends a poll and removes it from the store', async () => {
    const poll = createPoll();
    poll.timeout = setTimeout(() => {}, 99999);

    const mockMessage = {
      edit: vi.fn().mockResolvedValue(undefined),
    };
    const mockChannel = {
      isTextBased: () => true,
      messages: { fetch: vi.fn().mockResolvedValue(mockMessage) },
    };
    const mockClient = {
      channels: {
        cache: { get: vi.fn().mockReturnValue(mockChannel) },
      },
    };

    poll.client = mockClient as never;
    pollStore.set('msg1', poll);

    await endPoll('msg1', mockClient as never);

    expect(pollStore.has('msg1')).toBe(false);
    expect(mockMessage.edit).toHaveBeenCalled();
  });
});
