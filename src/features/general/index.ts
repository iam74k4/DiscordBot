import type { Client } from 'discord.js';

export const name = 'general';

/**
 * Start General feature
 */
export function start(_client: Client): void {
  // General commands do not require background startup work.
}

/**
 * Stop General feature
 */
export function stop(): void {
  // General commands do not require shutdown work.
}
