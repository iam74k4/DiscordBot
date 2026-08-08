import type { Client, MessageComponentInteraction } from 'discord.js';
import './helpCatalog.js';
import { pollStore, restorePolls } from './poll/index.js';
import { handleCommunityButtonInteraction } from './poll/button.js';

export const name = 'community';

/**
 * Start Community feature
 */
export async function start(client: Client): Promise<void> {
  await restorePolls(client);
}

/**
 * Claim poll vote buttons. Returns false for anything else so other features
 * still get a chance at the interaction.
 */
export async function handleComponent(
  interaction: MessageComponentInteraction
): Promise<boolean> {
  if (!interaction.isButton()) return false;
  return handleCommunityButtonInteraction(interaction);
}

/**
 * Stop Community feature.
 * Clears timers and in-memory state only; stored polls are restored on the
 * next start.
 */
export function stop(): void {
  pollStore.clearAll();
}
