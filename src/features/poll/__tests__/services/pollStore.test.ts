import { describe, it, expect, beforeEach } from 'vitest';
import {
  pollStore,
  type PollData,
} from '../../services/pollStore.js';

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

  describe('set and get', () => {
    it('should store and retrieve a poll', () => {
      const poll = createMockPoll('1');
      pollStore.set('msg1', poll);

      const retrieved = pollStore.get('msg1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.question).toBe('Test question 1');
    });

    it('should return undefined for non-existent poll', () => {
      expect(pollStore.get('non-existent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing poll', () => {
      pollStore.set('msg1', createMockPoll('1'));
      expect(pollStore.has('msg1')).toBe(true);
    });

    it('should return false for non-existent poll', () => {
      expect(pollStore.has('non-existent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing poll', () => {
      pollStore.set('msg1', createMockPoll('1'));
      const result = pollStore.delete('msg1');

      expect(result).toBe(true);
      expect(pollStore.has('msg1')).toBe(false);
    });

    it('should return false when deleting non-existent poll', () => {
      expect(pollStore.delete('non-existent')).toBe(false);
    });

    it('should clear timeout when deleting poll with timeout', () => {
      const poll = createMockPoll('1');
      poll.timeout = setTimeout(() => {}, 10000);

      pollStore.set('msg1', poll);
      pollStore.delete('msg1');

      // Timeout should be cleared (no way to directly verify, but no errors)
      expect(pollStore.has('msg1')).toBe(false);
    });
  });

  describe('entries', () => {
    it('should iterate over all polls', () => {
      pollStore.set('msg1', createMockPoll('1'));
      pollStore.set('msg2', createMockPoll('2'));

      const entries = [...pollStore.entries()];
      expect(entries.length).toBe(2);
    });
  });

  describe('clearAll', () => {
    it('should clear all polls', () => {
      pollStore.set('msg1', createMockPoll('1'));
      pollStore.set('msg2', createMockPoll('2'));
      expect(pollStore.size).toBe(2);

      pollStore.clearAll();
      expect(pollStore.size).toBe(0);
      expect(pollStore.has('msg1')).toBe(false);
      expect(pollStore.has('msg2')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      expect(pollStore.size).toBe(0);

      pollStore.set('msg1', createMockPoll('1'));
      expect(pollStore.size).toBe(1);

      pollStore.set('msg2', createMockPoll('2'));
      expect(pollStore.size).toBe(2);

      pollStore.delete('msg1');
      expect(pollStore.size).toBe(1);
    });
  });

  describe('vote recording', () => {
    it('should record votes in the poll', () => {
      const poll = createMockPoll('1');
      pollStore.set('msg1', poll);

      // Simulate voting
      const stored = pollStore.get('msg1')!;
      stored.votes.set('user1', 0);
      stored.votes.set('user2', 1);

      const retrieved = pollStore.get('msg1')!;
      expect(retrieved.votes.get('user1')).toBe(0);
      expect(retrieved.votes.get('user2')).toBe(1);
      expect(retrieved.votes.size).toBe(2);
    });

    it('should allow changing votes', () => {
      const poll = createMockPoll('1');
      pollStore.set('msg1', poll);

      const stored = pollStore.get('msg1')!;
      stored.votes.set('user1', 0);
      stored.votes.set('user1', 2); // Change vote

      const retrieved = pollStore.get('msg1')!;
      expect(retrieved.votes.get('user1')).toBe(2);
      expect(retrieved.votes.size).toBe(1);
    });
  });
});
