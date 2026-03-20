import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildPollResultEmbed,
  buildPollButtons,
  findUserPollInChannel,
  endPoll,
} from '../../services/pollService.js';
import { pollStore, type PollData } from '../../services/pollStore.js';

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

describe('pollService', () => {
  beforeEach(() => {
    pollStore.clearAll();
  });

  describe('buildPollResultEmbed', () => {
    it('builds embed with correct structure', () => {
      const poll = createPoll();
      const embed = buildPollResultEmbed(poll, false);
      expect(embed.data.title).toBeDefined();
      expect(embed.data.description).toBe('Test?');
      expect(embed.data.fields).toHaveLength(3);
    });

    it('shows ended title when ended=true', () => {
      const poll = createPoll();
      const embed = buildPollResultEmbed(poll, true);
      expect(embed.data.title).toContain('Ended');
    });

    it('counts votes per option correctly', () => {
      const poll = createPoll();
      poll.votes.set('u1', 0);
      poll.votes.set('u2', 0);
      poll.votes.set('u3', 1);
      const embed = buildPollResultEmbed(poll, false);
      expect(embed.data.fields?.[0].value).toContain('2 votes');
      expect(embed.data.fields?.[1].value).toContain('1 votes');
    });
  });

  describe('buildPollButtons', () => {
    it('builds one row for 3 options', () => {
      const poll = createPoll();
      const rows = buildPollButtons(poll, false);
      expect(rows).toHaveLength(1);
      expect(rows[0].components).toHaveLength(3);
    });

    it('builds multiple rows for 6 options', () => {
      const poll = createPoll({
        options: ['A', 'B', 'C', 'D', 'E', 'F'],
      });
      const rows = buildPollButtons(poll, false);
      expect(rows).toHaveLength(2);
    });
  });

  describe('findUserPollInChannel', () => {
    it('returns messageId for matching creator in channel', () => {
      const poll = createPoll({ creatorId: 'u1', channelId: 'ch1' });
      pollStore.set('msg1', poll);
      expect(findUserPollInChannel('u1', 'ch1')).toBe('msg1');
    });

    it('returns null when no matching poll', () => {
      const poll = createPoll({ creatorId: 'u1', channelId: 'ch1' });
      pollStore.set('msg1', poll);
      expect(findUserPollInChannel('u2', 'ch1')).toBeNull();
      expect(findUserPollInChannel('u1', 'ch2')).toBeNull();
    });
  });

  describe('endPoll', () => {
    it('returns early when poll does not exist', async () => {
      await endPoll('non-existent');
      expect(pollStore.has('non-existent')).toBe(false);
    });

    it('clears timeout and deletes poll on success', async () => {
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
});
