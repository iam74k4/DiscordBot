import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_ACTIVE_POLLS,
  pollStore,
  type PollData,
} from '../poll/pollStore.js';

describe('PollStore', () => {
  const createMockPoll = (id: string): PollData => ({
    question: `Test question ${id}`,
    options: ['Option A', 'Option B', 'Option C'],
    votes: new Map(),
    creatorId: 'creator123',
    anonymous: false,
    channelId: 'channel123',
    guildId: 'guild123',
    locale: 'en',
  });

  beforeEach(() => {
    pollStore.clearAll();
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

  it('clears all polls on shutdown', () => {
    pollStore.set('msg1', createMockPoll('1'));
    pollStore.set('msg2', createMockPoll('2'));

    pollStore.clearAll();

    expect(pollStore.size).toBe(0);
    expect(pollStore.has('msg1')).toBe(false);
    expect(pollStore.has('msg2')).toBe(false);
  });

  it('enforces the active poll limit', () => {
    for (let i = 0; i < MAX_ACTIVE_POLLS; i++) {
      pollStore.set(`msg${i}`, createMockPoll(String(i)));
    }

    expect(pollStore.canCreate()).toBe(false);
    expect(() => pollStore.set('overflow', createMockPoll('overflow'))).toThrow(
      `Active poll limit reached (${MAX_ACTIVE_POLLS})`
    );
  });
});
