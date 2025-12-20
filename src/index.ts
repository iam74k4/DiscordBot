import { createClient } from './client.js';
import { env } from './config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { logger } from './utils/logger.js';
import { startScheduler } from './services/scheduler/index.js';
import { startNotificationSystem } from './services/notifications/index.js';

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

  // Start scheduler for periodic tasks
  startScheduler();

  // Login to Discord
  await client.login(env.DISCORD_TOKEN);

  // Start notification system after login
  startNotificationSystem(client);
}

// Run the bot
main().catch((error) => {
  // Log error with more details (Discord errors don't serialize well)
  if (error instanceof Error) {
    logger.error(`Failed to start bot: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
  } else {
    logger.error('Failed to start bot:', error);
  }
  process.exit(1);
});
