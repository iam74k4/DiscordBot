import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deleteOldLogs = vi.fn(() => 2);
const loggerInfo = vi.fn();

vi.mock('../repositories/index.js', () => ({
  auditRepository: {
    deleteOldLogs,
  },
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    AUDIT_LOG_RETENTION_DAYS: 90,
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: loggerInfo,
  },
}));

describe('admin feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs audit cleanup immediately and avoids duplicate intervals', async () => {
    const { start, stop } = await import('../index.js');
    const client = {} as never;

    start(client);
    start(client);

    expect(deleteOldLogs).toHaveBeenCalledTimes(1);
    expect(deleteOldLogs).toHaveBeenCalledWith(90);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(deleteOldLogs).toHaveBeenCalledTimes(2);

    stop();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(deleteOldLogs).toHaveBeenCalledTimes(2);
  });
});
