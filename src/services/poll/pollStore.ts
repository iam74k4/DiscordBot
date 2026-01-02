import { Client } from 'discord.js';
import { BoundedMap } from '../../utils/lruCache.js';
import { Locale } from '../../locales/index.js';

// Maximum number of active polls to prevent memory issues
const MAX_ACTIVE_POLLS = 1000;

/**
 * Poll data structure
 */
export interface PollData {
  /** Poll question */
  question: string;
  /** Poll options */
  options: string[];
  /** Votes per option (userId -> optionIndex) */
  votes: Map<string, number>;
  /** Poll creator ID */
  creatorId: string;
  /** Whether the poll is anonymous */
  anonymous: boolean;
  /** Auto-end timeout */
  timeout?: NodeJS.Timeout;
  /** Channel ID */
  channelId: string;
  /** Guild ID */
  guildId: string;
  /** Discord client reference for auto-end */
  client?: Client;
  /** Creator's locale for consistent display */
  locale: Locale;
}

/**
 * Poll store - manages active polls
 * Using BoundedMap to prevent memory leaks from abandoned polls
 */
class PollStore {
  private store = new BoundedMap<string, PollData>(MAX_ACTIVE_POLLS);

  /**
   * Get a poll by message ID
   */
  get(messageId: string): PollData | undefined {
    return this.store.get(messageId);
  }

  /**
   * Check if a poll exists
   */
  has(messageId: string): boolean {
    return this.store.has(messageId);
  }

  /**
   * Store a poll
   */
  set(messageId: string, poll: PollData): void {
    this.store.set(messageId, poll);
  }

  /**
   * Delete a poll
   */
  delete(messageId: string): boolean {
    const poll = this.store.get(messageId);
    if (poll?.timeout) {
      clearTimeout(poll.timeout);
    }
    return this.store.delete(messageId);
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[string, PollData]> {
    return this.store.entries();
  }

  /**
   * Get the number of active polls
   */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Singleton poll store instance
 */
export const pollStore = new PollStore();

