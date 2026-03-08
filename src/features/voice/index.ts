import type { Client } from 'discord.js';
import { memoryMonitor } from './services/memoryMonitor.js';
import { fileCleanupService } from './services/fileCleanup.js';
import { audioBufferManager } from './services/audioBuffer.js';
import { connectionManager } from './services/connectionManager.js';
import { setServiceStatus } from '../../services/health/index.js';

export const name = 'voice';

/**
 * Start Voice feature services
 */
export function start(_client: Client): void {
  audioBufferManager.startCleanup();

  memoryMonitor.start();
  setServiceStatus('voiceMemoryMonitor', true);

  fileCleanupService.start();
  setServiceStatus('voiceFileCleanup', true);
}

/**
 * Stop Voice feature services
 */
export async function stop(): Promise<void> {
  fileCleanupService.stop();
  setServiceStatus('voiceFileCleanup', false);

  memoryMonitor.stop();
  setServiceStatus('voiceMemoryMonitor', false);

  for (const [channelId] of connectionManager.getAllConnections()) {
    await connectionManager.disconnect(channelId);
  }

  audioBufferManager.stopCleanup();
}

export { connectionManager, audioBufferManager };
