import { createClient } from './client.js';
import { env } from './config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { logger } from './utils/logger.js';
import { start as startSteam, stop as stopSteam } from './features/steam/index.js';
import { start as startVoice, stop as stopVoice } from './features/voice/index.js';
import {
  closeDatabase,
  initializeDatabase,
} from './services/database/index.js';
import { backupService } from './services/backup/index.js';
import type { ExtendedClient } from './client.js';

// Flag to prevent multiple shutdown attempts
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(
  client: ExtendedClient,
  signal: string
): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  try {
    // Stop services in reverse order of startup
    logger.debug('Stopping Voice feature...');
    await stopVoice();

    logger.debug('Stopping backup service...');
    backupService.stop();

    logger.debug('Stopping Steam feature...');
    stopSteam();

    logger.debug('Closing database connection...');
    closeDatabase();

    logger.debug('Destroying Discord client...');
    client.destroy();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error(
      'Error during graceful shutdown:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Starting Discord bot...');

  // Initialize database first
  initializeDatabase();

  // Create client instance
  const client = createClient();

  // Register shutdown handlers
  process.on('SIGINT', () => gracefulShutdown(client, 'SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown(client, 'SIGTERM'));

  // Process-level error handlers
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown(client, 'uncaughtException');
  });

  // Discord client error handler (non-async per discord.js docs)
  client.on('error', (error) => {
    logger.error('Discord client error:', error);
  });

  // Load commands and events
  await loadCommands(client);
  await loadEvents(client);

  // Login to Discord first (before starting services that depend on it)
  await client.login(env.DISCORD_TOKEN);

  // Start features
  startSteam(client);
  startVoice(client);

  // Start backup service
  backupService.start();

  logger.info('Discord bot started successfully');
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
