import type { Client } from 'discord.js';
import './helpCatalog.js';
import { pollStore } from './poll/index.js';

export const name = 'community';

/**
 * Start Community feature
 */
export function start(_client: Client): void {
  // Community commands do not require background startup work.
}

/**
 * Stop Community feature
 */
export function stop(): void {
  pollStore.clearAll();
}
