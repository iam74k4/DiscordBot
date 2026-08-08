import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const disconnectOldest = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const getAllConnections = vi.hoisted(() => vi.fn());
const getTotalMixBufferSizeMB = vi.hoisted(() => vi.fn().mockReturnValue(86));
const sendAlert = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../recording/connectionManager.js', () => ({
  connectionManager: { disconnectOldest, getAllConnections },
}));

vi.mock('../recording/channelMixRing.js', () => ({
  channelMixRingManager: { getTotalMixBufferSizeMB },
}));

vi.mock('../../../shared/utils/alert.js', () => ({ sendAlert }));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

vi.mock('../../../config/index.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../config/index.js')
  >('../../../config/index.js');
  return {
    ...actual,
    env: { ...actual.env, MEMORY_LIMIT_MB: 1000 },
    MONITORING: { MEMORY_MONITOR_INTERVAL_MS: 60_000 },
  };
});

const { MemoryMonitor } = await import('../jobs/memoryMonitor.js');

/** Fake three connected channels so shedding has something to drop. */
function connections(count: number) {
  return new Map(
    Array.from({ length: count }, (_, i) => [`channel-${i}`, { channelId: i }])
  );
}

function mockMemory(rssMB: number) {
  vi.spyOn(process, 'memoryUsage').mockReturnValue({
    rss: rssMB * 1024 * 1024,
    heapUsed: 40 * 1024 * 1024,
    heapTotal: 60 * 1024 * 1024,
    external: 0,
    arrayBuffers: 0,
  } as NodeJS.MemoryUsage);
}

describe('MemoryMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllConnections.mockReturnValue(connections(3));
    getTotalMixBufferSizeMB.mockReturnValue(86);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports RSS, because mix rings live outside the V8 heap', async () => {
    mockMemory(700);
    const stats = await new MemoryMonitor().getStats();

    expect(stats.memoryUsageMB).toBeCloseTo(700);
    expect(stats.heapUsedMB).toBeCloseTo(40);
    expect(stats.limitMB).toBe(1000);
    expect(stats.totalBufferSizeMB).toBe(86);
  });

  it('sheds the oldest connections once RSS passes the critical ratio', async () => {
    mockMemory(900); // 90% of the 1000MB budget
    const monitor = new MemoryMonitor();

    await monitor['checkMemoryUsage']();

    expect(sendAlert).toHaveBeenCalled();
    expect(disconnectOldest).toHaveBeenCalledWith(1);
  });

  it('warns without disconnecting between the warning and critical ratios', async () => {
    mockMemory(750); // 75%: above warn (70%), below critical (85%)
    const monitor = new MemoryMonitor();

    await monitor['checkMemoryUsage']();

    expect(disconnectOldest).not.toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('leaves connections alone below the warning ratio', async () => {
    mockMemory(300);
    const monitor = new MemoryMonitor();

    await monitor['checkMemoryUsage']();

    expect(disconnectOldest).not.toHaveBeenCalled();
  });

  it('does not shed twice while a slow check is still running', async () => {
    mockMemory(950);
    let release: (() => void) | undefined;
    disconnectOldest.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    const monitor = new MemoryMonitor();
    const first = monitor['checkMemoryUsage']();
    await monitor['checkMemoryUsage']();

    expect(disconnectOldest).toHaveBeenCalledTimes(1);

    release?.();
    await first;
  });
});
