import * as cron from 'node-cron';
import { getErrorMessage, logger } from '../../../../shared/utils/logger.js';
import { env } from '../../../../config/index.js';
import { steamClient } from '../../integrations/steam/index.js';
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
const PLAYTIME_CONCURRENCY = 5;

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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

    for (let i = 0; i < users.length; i += PLAYTIME_CONCURRENCY) {
      const batch = users.slice(i, i + PLAYTIME_CONCURRENCY);

      await Promise.all(
        batch.map(async (user) => {
          try {
            const totalPlaytime = await steamClient.getTotalPlaytime(
              user.steam_id
            );

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
              getErrorMessage(error)
            );
          }
        })
      );

      if (i + PLAYTIME_CONCURRENCY < users.length) {
        await wait(300);
      }
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
    const deleted = playtimeRepository.cleanupOldRecords(
      env.PLAYTIME_HISTORY_RETENTION_DAYS
    );
    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} old playtime records`);
    }
  } catch (error) {
    logger.error('Cleanup failed:', getErrorMessage(error));
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
