import { Client } from 'discord.js';
import { Locale } from '../../../locales/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { pollRepository } from './pollRepository.js';

export const MAX_ACTIVE_POLLS = 1000;
/** Per-guild cap so one server cannot consume the global budget. */
export const MAX_ACTIVE_POLLS_PER_GUILD = 50;

export interface PollData {
  question: string;
  options: string[];
  votes: Map<string, number>;
  creatorId: string;
  anonymous: boolean;
  endsAt?: number;
  timeout?: NodeJS.Timeout;
  /** Set synchronously when finalization begins; blocks further votes. */
  ended?: boolean;
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
    if (!this.store.has(messageId) && !this.canCreate(poll.guildId)) {
      throw new Error(`Active poll limit reached (${MAX_ACTIVE_POLLS})`);
    }
    this.store.set(messageId, poll);
    this.persist(messageId, poll);
  }

  /**
   * Restore a poll read back from the database. Unlike `set`, this does not
   * write it out again and is not subject to the creation limits - the rows
   * already exist.
   */
  restore(messageId: string, poll: PollData): void {
    this.store.set(messageId, poll);
  }

  canCreate(guildId?: string): boolean {
    if (this.store.size >= MAX_ACTIVE_POLLS) return false;
    if (!guildId) return true;
    return this.countForGuild(guildId) < MAX_ACTIVE_POLLS_PER_GUILD;
  }

  countForGuild(guildId: string): number {
    let count = 0;
    for (const poll of this.store.values()) {
      if (poll.guildId === guildId) count++;
    }
    return count;
  }

  /**
   * Mark finalization started in memory and on disk so a restart cannot
   * reopen voting before Discord publish / delete completes.
   */
  markEnded(messageId: string): void {
    const poll = this.store.get(messageId);
    if (!poll) return;

    poll.ended = true;
    try {
      pollRepository.markEnded(messageId);
    } catch (error) {
      logger.error(
        `Failed to persist ended state for poll ${messageId}: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Record a vote in the database first, then memory.
   * Returns false when persistence fails so callers do not ack a vote that
   * would vanish on the next restart.
   */
  setVote(messageId: string, userId: string, optionIndex: number): boolean {
    const poll = this.store.get(messageId);
    if (!poll || poll.ended) return false;

    try {
      pollRepository.upsertVote(messageId, userId, optionIndex);
    } catch (error) {
      logger.warn(
        `Failed to persist vote on poll ${messageId}: ${getErrorMessage(error)}`
      );
      return false;
    }

    poll.votes.set(userId, optionIndex);
    return true;
  }

  delete(messageId: string): boolean {
    const poll = this.store.get(messageId);
    if (poll?.timeout) {
      clearTimeout(poll.timeout);
    }
    try {
      pollRepository.remove(messageId);
    } catch (error) {
      logger.warn(
        `Failed to delete stored poll ${messageId}: ${getErrorMessage(error)}`
      );
    }
    return this.store.delete(messageId);
  }

  entries(): IterableIterator<[string, PollData]> {
    return this.store.entries();
  }

  get size(): number {
    return this.store.size;
  }

  /**
   * Drop in-memory state and timers only. Shutdown must not delete stored
   * polls - they are exactly what the next startup restores.
   */
  clearAll(): void {
    for (const poll of this.store.values()) {
      if (poll.timeout) {
        clearTimeout(poll.timeout);
        poll.timeout = undefined;
      }
    }
    this.store.clear();
  }

  private persist(messageId: string, poll: PollData): void {
    try {
      pollRepository.create({
        messageId,
        guildId: poll.guildId,
        channelId: poll.channelId,
        creatorId: poll.creatorId,
        question: poll.question,
        options: poll.options,
        anonymous: poll.anonymous,
        endsAt: poll.endsAt,
        locale: poll.locale,
      });
    } catch (error) {
      logger.warn(
        `Failed to persist poll ${messageId}: ${getErrorMessage(error)}`
      );
    }
  }
}

export const pollStore = new PollStore();
