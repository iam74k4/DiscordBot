import { createApp, type App } from './app/composition.js';
import { loadConfig } from './config/index.js';
import { getErrorMessage, logger } from './shared/utils/logger.js';
import { sendAlert } from './shared/utils/alert.js';

/**
 * Process entry point.
 *
 * Owns only what belongs to the process itself - reading configuration,
 * signals, and last-resort error reporting. What the bot is made of, and the
 * order it is assembled and torn down in, lives in the composition root.
 */
let isShuttingDown = false;

async function gracefulShutdown(
  app: App,
  signal: string,
  shutdownTimeoutMs: number
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
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  await app.stop();

  clearTimeout(forceExitTimer);
  logger.info('Graceful shutdown complete');
  process.exit(0);
}

function reportAlert(title: string, message: string, stack?: string): void {
  sendAlert(
    title,
    message,
    stack ? [{ name: 'Stack', value: stack.slice(0, 1000) }] : undefined
  ).catch((error: unknown) => {
    logger.error(`Failed to send alert for ${title}:`, getErrorMessage(error));
  });
}

function installProcessHandlers(app: App, shutdownTimeoutMs: number): void {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => gracefulShutdown(app, signal, shutdownTimeoutMs));
  }

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    reportAlert(
      'Unhandled Promise Rejection',
      getErrorMessage(reason ?? 'Unknown'),
      reason instanceof Error ? reason.stack : undefined
    );
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    reportAlert('Uncaught Exception', getErrorMessage(error), error.stack);

    void gracefulShutdown(app, 'uncaughtException', shutdownTimeoutMs).catch(
      (e: unknown) => {
        logger.error('Shutdown failed after uncaughtException:', e);
        process.exit(1);
      }
    );
  });

  app.client.on('error', (error) => {
    logger.error('Discord client error:', error);
    reportAlert('Discord Client Error', getErrorMessage(error));
  });
}

async function main(): Promise<void> {
  // Read and validate configuration before anything else can observe it.
  const config = loadConfig();

  logger.info('Starting Discord bot...');

  const app = createApp(config);
  installProcessHandlers(app, config.SHUTDOWN_TIMEOUT_MS);

  await app.start();

  logger.info('Discord bot started successfully');
}

main().catch((error) => {
  logger.error(`Failed to start bot: ${getErrorMessage(error)}`);
  if (error instanceof Error && error.stack) {
    logger.error(`Stack: ${error.stack}`);
  }
  process.exit(1);
});
