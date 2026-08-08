import { once } from 'node:events';
import { Events } from 'discord.js';
import { createClient } from './client.js';
import { env } from './config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { getErrorMessage, logger } from './shared/utils/logger.js';
import { sendAlert } from './shared/utils/alert.js';
import {
  loadFeatures,
  startAllFeatures,
  stopAllFeatures,
} from './features/index.js';
import {
  closeDatabase,
  initializeDatabase,
} from './infrastructure/database/index.js';
import { backupService } from './infrastructure/backup/index.js';
import {
  startAuditRetention,
  stopAuditRetention,
} from './infrastructure/audit/index.js';
import { cooldownStore } from './middleware/cooldown/cooldownStore.js';
import type { ExtendedClient } from './client.js';

let isShuttingDown = false;

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

  const forceExitTimer = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  const steps: [string, () => void | Promise<void>][] = [];

  if (env.SHUTDOWN_FINAL_BACKUP) {
    steps.push([
      'Final backup',
      async () => {
        const result = await backupService.runBackup();
        if (!result.success) {
          logger.warn(`Final backup failed: ${result.error ?? 'Unknown'}`);
        }
      },
    ]);
  }

  steps.push(
    ['Backup service', () => backupService.stop()],
    ['Audit retention', () => stopAuditRetention()],
    ['Features', () => stopAllFeatures()],
    ['Cooldown store', () => cooldownStore.clearAll()],
    ['Database', () => closeDatabase()],
    ['Discord client', () => client.destroy()]
  );

  for (const [name, fn] of steps) {
    try {
      logger.debug(`Stopping ${name}...`);
      await fn();
    } catch (error) {
      logger.error(`Failed to stop ${name}:`, getErrorMessage(error));
    }
  }

  clearTimeout(forceExitTimer);
  logger.info('Graceful shutdown complete');
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info('Starting Discord bot...');

  await initializeDatabase();

  const client = createClient();

  process.on('SIGINT', () => gracefulShutdown(client, 'SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown(client, 'SIGTERM'));
  process.on('SIGHUP', () => gracefulShutdown(client, 'SIGHUP'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    const message = getErrorMessage(reason ?? 'Unknown');
    const stack =
      reason instanceof Error && reason.stack
        ? reason.stack.slice(0, 1000)
        : 'N/A';
    sendAlert('Unhandled Promise Rejection', message, [
      { name: 'Stack', value: stack },
    ]).catch((err) => {
      logger.error(
        'Failed to send alert for unhandledRejection:',
        getErrorMessage(err)
      );
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    sendAlert(
      'Uncaught Exception',
      getErrorMessage(error),
      error instanceof Error && error.stack
        ? [{ name: 'Stack', value: error.stack.slice(0, 1000) }]
        : undefined
    ).catch((err) => {
      logger.error(
        'Failed to send alert for uncaughtException:',
        getErrorMessage(err)
      );
    });
    void gracefulShutdown(client, 'uncaughtException').catch((e) => {
      logger.error('Shutdown failed after uncaughtException:', e);
      process.exit(1);
    });
  });

  client.on('error', (error) => {
    logger.error('Discord client error:', error);
    sendAlert('Discord Client Error', getErrorMessage(error)).catch((err) => {
      logger.error(
        'Failed to send alert for Discord client error:',
        getErrorMessage(err)
      );
    });
  });

  await loadFeatures();
  await loadCommands(client);
  await loadEvents(client);

  await client.login(env.DISCORD_TOKEN);

  if (!client.isReady()) {
    await once(client, Events.ClientReady);
  }

  await startAllFeatures(client);

  backupService.start();
  startAuditRetention();

  logger.info('Discord bot started successfully');
}

main().catch((error) => {
  logger.error(`Failed to start bot: ${getErrorMessage(error)}`);
  if (error instanceof Error && error.stack) {
    logger.error(`Stack: ${error.stack}`);
  }
  process.exit(1);
});
