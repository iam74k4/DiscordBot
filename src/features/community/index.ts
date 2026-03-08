import type { Client } from 'discord.js';

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
  // Community commands do not require shutdown work.
}
