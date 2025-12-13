import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './types/index.js';

/**
 * Extended Discord client with custom properties
 */
export class ExtendedClient extends Client {
  /** Collection of loaded commands */
  public commands: Collection<string, Command> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.GuildMembers, // Requires enabling in Developer Portal
      ],
    });
  }
}

/**
 * Create and configure the Discord client
 */
export function createClient(): ExtendedClient {
  return new ExtendedClient();
}
