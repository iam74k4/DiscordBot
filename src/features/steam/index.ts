import type { Client } from 'discord.js';
import './helpCatalog.js';
import {
  startNotificationSystem,
  stopNotificationSystem,
} from './jobs/notifications/index.js';
import { startScheduler, stopScheduler } from './jobs/scheduler/index.js';
import { steamClient } from './integrations/steam/index.js';
import { setServiceStatus } from '../../infrastructure/health/index.js';

export const name = 'steam';
let isSteamFeatureStarted = false;

/**
 * Start Steam integrations and jobs
 */
export function start(client: Client): void {
  if (isSteamFeatureStarted) {
    return;
  }

  startScheduler();
  setServiceStatus('steamScheduler', true);

  startNotificationSystem(client);
  setServiceStatus('steamNotifications', true);
  isSteamFeatureStarted = true;
}

/**
 * Stop Steam integrations and jobs
 */
export async function stop(): Promise<void> {
  if (!isSteamFeatureStarted) {
    return;
  }

  stopNotificationSystem();
  setServiceStatus('steamNotifications', false);

  stopScheduler();
  setServiceStatus('steamScheduler', false);
  isSteamFeatureStarted = false;
}

export { steamClient };
