import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPollButtons,
  buildPollResultEmbed,
  endPoll,
  findUserPollInChannel,
  handlePollVote,
} from '../poll/pollService.js';
import { pollStore, type PollData } from '../poll/pollStore.js';

vi.mock('../../../locales/index.js', () => ({
  mapDiscordLocale: () => 'en',
  t: (key: string, _locale: string, params?: Record<string, unknown>) => {
    if (key === 'poll.votes') return `${params?.count ?? 0} votes`;
    if (key === 'poll.anonymous') return 'Anonymous';
    if (key === 'poll.endsIn') return `Ends in ${params?.duration ?? 0} min`;
    if (key === 'poll.total') return `Total: ${params?.count ?? 0}`;
    if (key === 'poll.title') return 'Poll';
    if (key === 'poll.ended') return 'Poll Ended';
    if (key === 'poll.votedFor') return `Voted for ${params?.option ?? ''}`;
    if (key === 'poll.errors.pollEndedDesc') return 'Poll has ended';
    if (key === 'poll.errors.pollErrorDesc') return 'Poll error';
    return key;
  },
}));

const markEnded = vi.hoisted(() => vi.fn());
const upsertVote = vi.hoisted(() => vi.fn());

vi.mock('../poll/pollRepository.js', () => ({
  pollRepository: {
    create: vi.fn(),
    remove: vi.fn(),
    upsertVote,
    markEnded,
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

function createEditableClient(editImpl?: () => Promise<unknown>) {
  const mockMessage = {
    edit: vi.fn().mockImplementation(editImpl ?? (() => Promise.resolve())),
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
  return { mockMessage, mockChannel, mockClient };
}

describe('community poll service', () => {
  beforeEach(() => {
    pollStore.clearAll();
    vi.clearAllMocks();
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
    const { mockMessage, mockClient } = createEditableClient();

    poll.client = mockClient as never;
    pollStore.set('msg1', poll);

    await endPoll('msg1', mockClient as never);

    expect(pollStore.has('msg1')).toBe(false);
    expect(mockMessage.edit).toHaveBeenCalled();
  });

  it('rejects votes after finalization has started', async () => {
    const poll = createPoll({ ended: true });
    pollStore.set('msg1', poll);

    const interaction = {
      message: { id: 'msg1', edit: vi.fn() },
      customId: 'poll_vote_0',
      user: { id: 'voter1' },
      locale: 'en-US',
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handlePollVote(interaction as never);

    expect(poll.votes.size).toBe(0);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Poll has ended' })
    );
    expect(interaction.message.edit).not.toHaveBeenCalled();
  });

  it('does not let a late vote overwrite the ended embed', async () => {
    const poll = createPoll();
    pollStore.set('msg1', poll);

    let releaseReply!: () => void;
    const replyGate = new Promise<void>((resolve) => {
      releaseReply = resolve;
    });

    const interaction = {
      message: { id: 'msg1', edit: vi.fn().mockResolvedValue(undefined) },
      customId: 'poll_vote_0',
      user: { id: 'voter1' },
      locale: 'en-US',
      reply: vi.fn().mockImplementation(async () => {
        await replyGate;
      }),
    };

    const votePromise = handlePollVote(interaction as never);
    // Vote is recorded synchronously before the ack await.
    expect(poll.votes.get('voter1')).toBe(0);

    const { mockMessage, mockClient } = createEditableClient();
    poll.client = mockClient as never;

    await endPoll('msg1', mockClient as never);
    expect(poll.ended).toBe(true);
    expect(pollStore.has('msg1')).toBe(false);
    expect(mockMessage.edit).toHaveBeenCalledTimes(1);
    const endedEdit = mockMessage.edit.mock.calls[0][0];
    expect(endedEdit.components).toBeDefined();
    expect(endedEdit.embeds[0].data.title).toBe('Poll Ended');

    releaseReply();
    await votePromise;

    expect(interaction.message.edit).not.toHaveBeenCalled();
  });

  it('keeps ended poll votes when Discord edit fails', async () => {
    const poll = createPoll();
    poll.votes.set('voter1', 0);
    const { mockClient } = createEditableClient(() =>
      Promise.reject(new Error('Discord unavailable'))
    );
    poll.client = mockClient as never;
    pollStore.set('msg1', poll);

    await endPoll('msg1', mockClient as never);

    expect(pollStore.has('msg1')).toBe(true);
    expect(poll.ended).toBe(true);
    expect(markEnded).toHaveBeenCalledWith('msg1');
    expect(pollStore.get('msg1')?.votes.get('voter1')).toBe(0);
  });

  it('does not acknowledge a vote that failed to persist', async () => {
    const poll = createPoll();
    pollStore.set('msg1', poll);
    upsertVote.mockImplementationOnce(() => {
      throw new Error('database is locked');
    });

    const interaction = {
      message: { id: 'msg1', edit: vi.fn() },
      customId: 'poll_vote_0',
      user: { id: 'voter1' },
      locale: 'en-US',
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handlePollVote(interaction as never);

    expect(poll.votes.size).toBe(0);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Poll error' })
    );
    expect(interaction.message.edit).not.toHaveBeenCalled();
  });

  it('keeps ended poll votes when the channel is not cached', async () => {
    const poll = createPoll();
    poll.votes.set('voter1', 1);
    const mockClient = {
      channels: {
        cache: { get: vi.fn().mockReturnValue(undefined) },
      },
    };
    poll.client = mockClient as never;
    pollStore.set('msg1', poll);

    await endPoll('msg1', mockClient as never);

    expect(pollStore.has('msg1')).toBe(true);
    expect(poll.ended).toBe(true);
    expect(pollStore.get('msg1')?.votes.get('voter1')).toBe(1);
  });

  it('drops the store entry when the poll message is already gone', async () => {
    const poll = createPoll();
    poll.votes.set('voter1', 0);
    const mockChannel = {
      isTextBased: () => true,
      messages: { fetch: vi.fn().mockResolvedValue(null) },
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
  });
});
