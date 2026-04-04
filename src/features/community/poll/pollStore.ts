import { Client } from 'discord.js';
import { Locale } from '../../../locales/index.js';

export const MAX_ACTIVE_POLLS = 1000;

export interface PollData {
  question: string;
  options: string[];
  votes: Map<string, number>;
  creatorId: string;
  anonymous: boolean;
  endsAt?: number;
  timeout?: NodeJS.Timeout;
  channelId: string;
  guildId: string;
  client?: Client;
  locale: Locale;
}

class PollStore {
  private store = new Map<string, PollData>();

  get(messageId: string): PollData | undefined {
    return this.store.get(messageId);
  }

  has(messageId: string): boolean {
    return this.store.has(messageId);
  }

  set(messageId: string, poll: PollData): void {
    if (!this.store.has(messageId) && !this.canCreate()) {
      throw new Error(`Active poll limit reached (${MAX_ACTIVE_POLLS})`);
    }
    this.store.set(messageId, poll);
  }

  canCreate(): boolean {
    return this.store.size < MAX_ACTIVE_POLLS;
  }

  delete(messageId: string): boolean {
    const poll = this.store.get(messageId);
    if (poll?.timeout) {
      clearTimeout(poll.timeout);
    }
    return this.store.delete(messageId);
  }

  entries(): IterableIterator<[string, PollData]> {
    return this.store.entries();
  }

  get size(): number {
    return this.store.size;
  }

  clearAll(): void {
    for (const [messageId] of this.entries()) {
      this.delete(messageId);
    }
  }
}

export const pollStore = new PollStore();
