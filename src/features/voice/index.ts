import type { FeatureContext } from '../index.js';
import { MemoryMonitor } from './jobs/memoryMonitor.js';
import { FileCleanupService } from './jobs/fileCleanup.js';
import { connectionManager } from './recording/connectionManager.js';
import { reconcileOccupiedVoiceChannels } from './application/reconcile.js';
import { setServiceStatus } from '../../infrastructure/health/index.js';

export const name = 'voice';

/**
 * Both jobs are built from the configuration this feature is started with,
 * not at import time: constructing them on import made merely importing the
 * module read and validate the environment.
 */
let memoryMonitor: MemoryMonitor | null = null;
let fileCleanupService: FileCleanupService | null = null;

/**
 * Start Voice jobs and recording runtime
 */
export async function start({ client, config }: FeatureContext): Promise<void> {
  memoryMonitor = new MemoryMonitor(config);
  memoryMonitor.start();
  setServiceStatus('voiceMemoryMonitor', true);

  fileCleanupService = new FileCleanupService(config);
  fileCleanupService.start();
  setServiceStatus('voiceFileCleanup', true);

  await reconcileOccupiedVoiceChannels(client);
}

/**
 * Stop Voice jobs and recording runtime
 */
export async function stop(): Promise<void> {
  fileCleanupService?.stop();
  fileCleanupService = null;
  setServiceStatus('voiceFileCleanup', false);

  memoryMonitor?.stop();
  memoryMonitor = null;
  setServiceStatus('voiceMemoryMonitor', false);

  for (const [channelId] of connectionManager.getAllConnections()) {
    await connectionManager.disconnect(channelId);
  }
}
