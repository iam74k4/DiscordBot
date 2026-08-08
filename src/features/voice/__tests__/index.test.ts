import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryMonitorStart = vi.fn();
const memoryMonitorStop = vi.fn();
const fileCleanupStart = vi.fn();
const fileCleanupStop = vi.fn();
const disconnect = vi.fn();
const getAllConnections = vi.fn(() => new Map<string, unknown>());
const setServiceStatus = vi.fn();
const reconcileOccupiedVoiceChannels = vi.fn().mockResolvedValue(undefined);

vi.mock('../jobs/memoryMonitor.js', () => ({
  memoryMonitor: {
    start: memoryMonitorStart,
    stop: memoryMonitorStop,
  },
}));

vi.mock('../jobs/fileCleanup.js', () => ({
  fileCleanupService: {
    start: fileCleanupStart,
    stop: fileCleanupStop,
  },
}));

vi.mock('../recording/connectionManager.js', () => ({
  connectionManager: {
    disconnect,
    getAllConnections,
  },
}));

vi.mock('../application/reconcile.js', () => ({
  reconcileOccupiedVoiceChannels,
}));

vi.mock('../../../infrastructure/health/index.js', () => ({
  setServiceStatus,
}));

describe('voice feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getAllConnections.mockReturnValue(new Map());
    reconcileOccupiedVoiceChannels.mockResolvedValue(undefined);
  });

  it('restarts voice jobs after stop and start and reconciles occupied channels', async () => {
    const { start, stop } = await import('../index.js');
    const client = {} as never;

    await start(client);
    await stop();
    await start(client);

    expect(memoryMonitorStart).toHaveBeenCalledTimes(2);
    expect(memoryMonitorStop).toHaveBeenCalledTimes(1);
    expect(fileCleanupStart).toHaveBeenCalledTimes(2);
    expect(fileCleanupStop).toHaveBeenCalledTimes(1);
    expect(reconcileOccupiedVoiceChannels).toHaveBeenCalledTimes(2);
    expect(reconcileOccupiedVoiceChannels).toHaveBeenCalledWith(client);
  });
});
