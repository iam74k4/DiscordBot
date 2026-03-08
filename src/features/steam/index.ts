import type { Client } from 'discord.js';
import './helpCatalog.js';
import {
  startNotificationSystem,
  stopNotificationSystem,
} from './services/notifications/index.js';
import { startScheduler, stopScheduler } from './services/scheduler/index.js';
import { steamClient } from './services/steam/index.js';
import { setServiceStatus } from '../../services/health/index.js';

export const name = 'steam';
let isSteamFeatureStarted = false;

/**
 * Start Steam feature services (notifications, scheduler)
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
 * Stop Steam feature services
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
