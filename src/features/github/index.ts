import type { Client } from 'discord.js';
import './helpCatalog.js';

export const name = 'github';

export function start(_client: Client): void {
  // No background services needed for GitHub feature
}

export function stop(): void {
  // No cleanup needed
}
