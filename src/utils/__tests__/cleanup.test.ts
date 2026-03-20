import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDailyCleanup, stopCleanupInterval } from '../cleanup.js';

describe('cleanup utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the cleanup immediately and then daily', () => {
    const task = vi.fn();

    const interval = startDailyCleanup(task);

    expect(task).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(task).toHaveBeenCalledTimes(2);

    stopCleanupInterval(interval);
  });

  it('stops the interval safely', () => {
    const task = vi.fn();

    const interval = startDailyCleanup(task);
    const stopped = stopCleanupInterval(interval);

    expect(stopped).toBeNull();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
