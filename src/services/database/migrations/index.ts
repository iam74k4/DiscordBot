import { logger } from '../../../utils/logger.js';
import { runTransaction } from '../transaction.js';
import { up as steamUp } from './001_steam.js';
import { up as notificationsUp } from './002_notifications.js';
import { up as settingsUp } from './003_settings.js';

const migrations = [steamUp, notificationsUp, settingsUp];

let isInitialized = false;

/**
 * Run all database migrations inside a single transaction.
 * Safe to call multiple times — only executes once.
 */
export function initializeDatabase(): void {
  if (isInitialized) {
    logger.warn('Database already initialized, skipping');
    return;
  }

  runTransaction(() => {
    for (const migration of migrations) {
      migration();
    }
  });

  isInitialized = true;
  logger.info('Database initialized');
}
