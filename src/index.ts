import { createClient } from './client.js';
import { env } from './config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Starting Discord bot...');

  // Create client instance
  const client = createClient();

  // Load commands and events
  await loadCommands();
  await loadEvents(client);

  // Login to Discord
  await client.login(env.DISCORD_TOKEN);
}

// Run the bot
main().catch((error) => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
