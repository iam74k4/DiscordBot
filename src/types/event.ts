import { ClientEvents } from 'discord.js';
import { ExtendedClient } from '../client.js';

/**
 * Event structure
 */
export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  /** Event name */
  name: K;
  /** Whether to run only once */
  once?: boolean;
  /** Event handler function */
  execute: (client: ExtendedClient, ...args: ClientEvents[K]) => Promise<void>;
}
