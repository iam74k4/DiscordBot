import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryMonitorStart = vi.fn();
const memoryMonitorStop = vi.fn();
const fileCleanupStart = vi.fn();
const fileCleanupStop = vi.fn();
const disconnect = vi.fn();
const getAllConnections = vi.fn(() => new Map<string, unknown>());
const setServiceStatus = vi.fn();

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

vi.mock('../../../infrastructure/health/index.js', () => ({
  setServiceStatus,
}));

describe('voice feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getAllConnections.mockReturnValue(new Map());
  });

  it('restarts voice jobs after stop and start', async () => {
    const { start, stop } = await import('../index.js');
    const client = {} as never;

    start(client);
    await stop();
    start(client);

    expect(memoryMonitorStart).toHaveBeenCalledTimes(2);
    expect(memoryMonitorStop).toHaveBeenCalledTimes(1);
    expect(fileCleanupStart).toHaveBeenCalledTimes(2);
    expect(fileCleanupStop).toHaveBeenCalledTimes(1);
  });
});
