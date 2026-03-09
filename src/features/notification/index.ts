import type { Client } from 'discord.js';
import './helpCatalog.js';
import { voiceTracker } from './services/voiceTracker.js';
import { logger } from '../../utils/logger.js';

export const name = 'notification';

export function start(_client: Client): void {
  voiceTracker.closeAllStaleSessions();
  logger.info('Notification feature started');
}

export function stop(): void {
  // No background services to stop
}
