import type { Client } from 'discord.js';
import {
  startNotificationSystem,
  stopNotificationSystem,
} from './services/notifications/index.js';
import { startScheduler, stopScheduler } from './services/scheduler/index.js';
import { steamClient } from './services/steam/index.js';
import { setServiceStatus } from '../../services/health/index.js';

/**
 * Start Steam feature services (notifications, scheduler)
 */
export function start(client: Client): void {
  startScheduler();
  setServiceStatus('scheduler', true);

  startNotificationSystem(client);
  setServiceStatus('notifications', true);
}

/**
 * Stop Steam feature services
 */
export async function stop(): Promise<void> {
  stopNotificationSystem();
  setServiceStatus('notifications', false);

  stopScheduler();
  setServiceStatus('scheduler', false);
}

export { steamClient };
