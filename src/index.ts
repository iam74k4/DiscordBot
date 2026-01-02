import { createClient } from './client.js';
import { env } from './config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { logger } from './utils/logger.js';
import {
  startScheduler,
  stopScheduler,
} from './services/scheduler/index.js';
import {
  startNotificationSystem,
  stopNotificationSystem,
} from './services/notifications/index.js';
import { memoryMonitor } from './services/voice/memoryMonitor.js';
import { fileCleanupService } from './services/voice/fileCleanup.js';
import { audioBufferManager } from './services/voice/audioBuffer.js';
import {
  closeDatabase,
  initializeDatabase,
} from './services/database/index.js';
import { backupService } from './services/backup/index.js';
import { setServiceStatus } from './services/health/index.js';
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
    logger.debug('Stopping file cleanup service...');
    fileCleanupService.stop();

    logger.debug('Stopping memory monitor...');
    memoryMonitor.stop();
    setServiceStatus('memoryMonitor', false);

    logger.debug('Stopping audio buffer cleanup...');
    audioBufferManager.stopCleanup();

    logger.debug('Stopping backup service...');
    backupService.stop();

    logger.debug('Stopping notification system...');
    stopNotificationSystem();
    setServiceStatus('notifications', false);

    logger.debug('Stopping scheduler...');
    stopScheduler();
    setServiceStatus('scheduler', false);

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

  // Load commands and events
  await loadCommands(client);
  await loadEvents(client);

  // Start scheduler for periodic tasks
  startScheduler();
  setServiceStatus('scheduler', true);

  // Login to Discord
  await client.login(env.DISCORD_TOKEN);

  // Start notification system after login
  startNotificationSystem(client);
  setServiceStatus('notifications', true);

  // Start memory monitor
  memoryMonitor.start();
  setServiceStatus('memoryMonitor', true);

  // Start file cleanup service
  fileCleanupService.start();

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
