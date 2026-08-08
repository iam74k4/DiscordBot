import type { Client } from 'discord.js';
import './helpCatalog.js';
import { pollStore, restorePolls } from './poll/index.js';

export const name = 'community';

/**
 * Start Community feature
 */
export async function start(client: Client): Promise<void> {
  await restorePolls(client);
}

/**
 * Stop Community feature.
 * Clears timers and in-memory state only; stored polls are restored on the
 * next start.
 */
export function stop(): void {
  pollStore.clearAll();
}
