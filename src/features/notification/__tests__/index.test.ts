import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const closeAllStaleSessions = vi.fn();
const cleanupOldSessions = vi.fn(() => 3);
const loggerInfo = vi.fn();

vi.mock('../services/voiceTracker.js', () => ({
  voiceTracker: {
    closeAllStaleSessions,
  },
}));

vi.mock('../repositories/voiceSessionRepository.js', () => ({
  voiceSessionRepository: {
    cleanupOldSessions,
  },
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    VOICE_SESSION_RETENTION_DAYS: 30,
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: loggerInfo,
  },
}));

describe('notification feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs voice session cleanup immediately and avoids duplicate intervals', async () => {
    const { start, stop } = await import('../index.js');
    const client = {} as never;

    start(client);
    start(client);

    expect(closeAllStaleSessions).toHaveBeenCalledTimes(1);
    expect(cleanupOldSessions).toHaveBeenCalledTimes(1);
    expect(cleanupOldSessions).toHaveBeenCalledWith(30);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(cleanupOldSessions).toHaveBeenCalledTimes(2);

    stop();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(cleanupOldSessions).toHaveBeenCalledTimes(2);
  });
});
