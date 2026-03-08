import * as cron from 'node-cron';
import { logger } from '../../../../utils/logger.js';
import { steamClient } from '../steam/index.js';
import {
  playtimeRepository,
  steamUserRepository,
} from '../../repositories/index.js';

/**
 * Scheduled task registry
 */
const scheduledTasks: cron.ScheduledTask[] = [];

let isRecording = false;
let isSchedulerStarted = false;

/**
 * Record playtime for all registered users
 */
async function recordAllUsersPlaytime(): Promise<void> {
  if (isRecording) {
    logger.warn('Playtime recording already in progress, skipping');
    return;
  }

  if (!steamClient.isConfigured()) {
    logger.debug('Steam API key not configured, skipping playtime recording');
    return;
  }

  isRecording = true;

  try {
    logger.info('Starting daily playtime recording...');

    const users = steamUserRepository.getAll();
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const totalPlaytime = await steamClient.getTotalPlaytime(user.steam_id);

        playtimeRepository.record(
          user.discord_id,
          user.steam_id,
          totalPlaytime
        );
        successCount++;
      } catch (error) {
        errorCount++;
        logger.warn(
          `Playtime recording failed for ${user.discord_id}:`,
          error instanceof Error ? error.message : error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.info(
      `Playtime recording complete: ${successCount} success, ${errorCount} errors`
    );
  } finally {
    isRecording = false;
  }
}

/**
 * Cleanup old records
 */
function runCleanup(): void {
  try {
    const deleted = playtimeRepository.cleanupOldRecords(365);
    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} old playtime records`);
    }
  } catch (error) {
    logger.error(
      'Cleanup failed:',
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Start all scheduled tasks
 */
export function startScheduler(): void {
  if (isSchedulerStarted) {
    logger.debug('Scheduler already started, skipping duplicate start');
    return;
  }

  logger.info('Starting scheduler...');

  // Daily playtime recording at 00:00 (midnight)
  const playtimeTask = cron.schedule(
    '0 0 * * *',
    async () => {
      await recordAllUsersPlaytime();
    },
    {
      timezone: 'Asia/Tokyo',
    }
  );
  scheduledTasks.push(playtimeTask);

  // Weekly cleanup on Sunday at 03:00
  const cleanupTask = cron.schedule(
    '0 3 * * 0',
    () => {
      runCleanup();
    },
    {
      timezone: 'Asia/Tokyo',
    }
  );
  scheduledTasks.push(cleanupTask);

  isSchedulerStarted = true;
  logger.info('Scheduler started with 2 tasks');
}

/**
 * Stop all scheduled tasks
 */
export function stopScheduler(): void {
  if (!isSchedulerStarted) {
    return;
  }

  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  isSchedulerStarted = false;
  logger.info('Scheduler stopped');
}

/**
 * Manually trigger playtime recording (for testing)
 */
export async function triggerPlaytimeRecording(): Promise<void> {
  await recordAllUsersPlaytime();
}
