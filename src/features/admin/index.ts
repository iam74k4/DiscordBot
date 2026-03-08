import type { Client } from 'discord.js';
import './helpCatalog.js';

export const name = 'admin';

/**
 * Start Admin feature
 */
export function start(_client: Client): void {
  // Admin commands do not require background startup work.
}

/**
 * Stop Admin feature
 */
export function stop(): void {
  // Admin commands do not require shutdown work.
}
