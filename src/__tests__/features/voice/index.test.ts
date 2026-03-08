import { beforeEach, describe, expect, it, vi } from 'vitest';

const startCleanup = vi.fn();
const stopCleanup = vi.fn();
const memoryMonitorStart = vi.fn();
const memoryMonitorStop = vi.fn();
const fileCleanupStart = vi.fn();
const fileCleanupStop = vi.fn();
const disconnect = vi.fn();
const getAllConnections = vi.fn(() => new Map<string, unknown>());
const setServiceStatus = vi.fn();

vi.mock('../../../features/voice/services/audioBuffer.js', () => ({
  audioBufferManager: {
    startCleanup,
    stopCleanup,
  },
}));

vi.mock('../../../features/voice/services/memoryMonitor.js', () => ({
  memoryMonitor: {
    start: memoryMonitorStart,
    stop: memoryMonitorStop,
  },
}));

vi.mock('../../../features/voice/services/fileCleanup.js', () => ({
  fileCleanupService: {
    start: fileCleanupStart,
    stop: fileCleanupStop,
  },
}));

vi.mock('../../../features/voice/services/connectionManager.js', () => ({
  connectionManager: {
    disconnect,
    getAllConnections,
  },
}));

vi.mock('../../../services/health/index.js', () => ({
  setServiceStatus,
}));

describe('voice feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getAllConnections.mockReturnValue(new Map());
  });

  it('restarts audio buffer cleanup after a stop', async () => {
    const { start, stop } = await import('../../../features/voice/index.js');
    const client = {} as never;

    start(client);
    await stop();
    start(client);

    expect(startCleanup).toHaveBeenCalledTimes(2);
    expect(stopCleanup).toHaveBeenCalledTimes(1);
    expect(memoryMonitorStart).toHaveBeenCalledTimes(2);
    expect(fileCleanupStart).toHaveBeenCalledTimes(2);
  });
});
