import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './types/index.js';

/**
 * Extended Discord client with custom properties
 */
export class ExtendedClient extends Client {
  /** Collection of loaded commands */
  public commands: Collection<string, Command> = new Collection();
  /** Whether the bot has fully initialised (ready event + commands registered) */
  public isFullyReady = false;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates, // Required for roulette command (voice channel members)
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
