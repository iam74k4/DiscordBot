import type { Client } from 'discord.js';
import './helpCatalog.js';
import { memoryMonitor } from './jobs/memoryMonitor.js';
import { fileCleanupService } from './jobs/fileCleanup.js';
import { channelMixRingManager } from './recording/channelMixRing.js';
import { connectionManager } from './recording/connectionManager.js';
import { setServiceStatus } from '../../infrastructure/health/index.js';

export const name = 'voice';

/**
 * Start Voice jobs and recording runtime
 */
export function start(_client: Client): void {
  memoryMonitor.start();
  setServiceStatus('voiceMemoryMonitor', true);

  fileCleanupService.start();
  setServiceStatus('voiceFileCleanup', true);
}

/**
 * Stop Voice jobs and recording runtime
 */
export async function stop(): Promise<void> {
  fileCleanupService.stop();
  setServiceStatus('voiceFileCleanup', false);

  memoryMonitor.stop();
  setServiceStatus('voiceMemoryMonitor', false);

  for (const [channelId] of connectionManager.getAllConnections()) {
    await connectionManager.disconnect(channelId);
  }

}

export { connectionManager, channelMixRingManager };
