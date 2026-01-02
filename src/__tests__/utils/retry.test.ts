import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, createRetryWrapper } from '../../utils/retry.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('retry utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 100,
        operationName: 'test',
      });

      // Fast-forward through the delay
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      const error = new Error('network error');
      const fn = vi.fn().mockRejectedValue(error);

      // Use a wrapper to handle the rejection properly
      let caughtError: Error | null = null;
      const resultPromise = withRetry(fn, {
        maxRetries: 2,
        baseDelayMs: 100,
        shouldRetry: () => true,
      }).catch((e) => {
        caughtError = e;
      });

      // Fast-forward through all retries
      await vi.advanceTimersByTimeAsync(1000);

      await resultPromise;

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('network error');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry when shouldRetry returns false', async () => {
      const error = new Error('400 Bad Request');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('400 Bad Request');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use default shouldRetry for network errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { baseDelayMs: 100 });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('500'))
        .mockRejectedValueOnce(new Error('500'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      });

      // First retry should be around 1000ms (with jitter)
      await vi.advanceTimersByTimeAsync(1500);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry should be around 2000ms (with jitter)
      await vi.advanceTimersByTimeAsync(3000);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should cap delay at maxDelayMs', async () => {
      // With many retries, delay should not exceed maxDelayMs
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('500'))
        .mockRejectedValueOnce(new Error('500'))
        .mockRejectedValueOnce(new Error('500'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 3000, // Cap at 3 seconds
      });

      // Advance time generously
      await vi.advanceTimersByTimeAsync(15000);

      const result = await resultPromise;
      expect(result).toBe('success');
    });
  });

  describe('createRetryWrapper', () => {
    it('should create wrapper with default options', async () => {
      const wrapper = createRetryWrapper({
        maxRetries: 2,
        baseDelayMs: 100,
      });

      const fn = vi.fn().mockResolvedValue('wrapped');

      const result = await wrapper(fn);

      expect(result).toBe('wrapped');
    });

    it('should allow override of default options', async () => {
      const wrapper = createRetryWrapper({
        maxRetries: 1,
        baseDelayMs: 100,
      });

      const fn = vi.fn().mockRejectedValue(new Error('500'));

      const resultPromise = wrapper(fn, {
        maxRetries: 0,
        shouldRetry: () => true,
      });

      await expect(resultPromise).rejects.toThrow('500');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
