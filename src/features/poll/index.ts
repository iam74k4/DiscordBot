import type { Client } from 'discord.js';
import './helpCatalog.js';
import { pollStore } from './services/pollStore.js';

export const name = 'poll';

/**
 * Start Poll feature
 */
export function start(_client: Client): void {
  // Poll state is initialized lazily by commands/events.
}

/**
 * Stop Poll feature - clear all active polls and cancel their timeouts
 */
export function stop(): void {
  pollStore.clearAll();
}
