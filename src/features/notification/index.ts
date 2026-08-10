import type { Client } from 'discord.js';
import { voiceTracker } from './tracking/voiceTracker.js';
import { voiceSessionRepository } from './repositories/voiceSessionRepository.js';
import { env } from '../../config/index.js';
import { logger } from '../../shared/utils/logger.js';
import {
  startDailyCleanup,
  stopCleanupInterval,
} from '../../shared/utils/cleanup.js';
import { resetVoiceDigests } from './events/voiceNotification.js';

export const name = 'notification';
let cleanupInterval: NodeJS.Timeout | null = null;

function cleanupOldVoiceSessions(): void {
  const deleted = voiceSessionRepository.cleanupOldSessions(
    env.VOICE_SESSION_RETENTION_DAYS
  );
  if (deleted > 0) {
    logger.info(`Cleaned up ${deleted} old voice session record(s)`);
  }
}

export function start(client: Client): void {
  if (cleanupInterval) {
    return;
  }
  voiceTracker.closeAllStaleSessions();
  voiceTracker.reconcileActiveVoiceSessions(client);
  cleanupInterval = startDailyCleanup(cleanupOldVoiceSessions);
  logger.info('Notification feature started');
}

export function stop(): void {
  voiceTracker.endAllSessions();
  resetVoiceDigests();
  cleanupInterval = stopCleanupInterval(cleanupInterval);
}
