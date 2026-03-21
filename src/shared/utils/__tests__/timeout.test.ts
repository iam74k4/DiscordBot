import { describe, expect, it } from 'vitest';
import { TimeoutError, withTimeout } from '../timeout.js';

describe('TimeoutError', () => {
  it('creates error with message and name', () => {
    const err = new TimeoutError(5000);
    expect(err.message).toBe('Operation timed out after 5000ms');
    expect(err.name).toBe('TimeoutError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('withTimeout', () => {
  it('resolves when promise settles before timeout', async () => {
    const result = await withTimeout(Promise.resolve('done'), 100);
    expect(result).toBe('done');
  });

  it('rejects with TimeoutError when promise exceeds timeout', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 200);
    });

    await expect(withTimeout(slowPromise, 50)).rejects.toThrow(TimeoutError);
    await expect(withTimeout(slowPromise, 50)).rejects.toMatchObject({
      message: 'Operation timed out after 50ms',
    });
  });

  it('rejects with original error when promise rejects before timeout', async () => {
    const failPromise = Promise.reject(new Error('Original error'));

    await expect(withTimeout(failPromise, 100)).rejects.toThrow(
      'Original error'
    );
  });

  it('clears timeout when promise resolves', async () => {
    await withTimeout(Promise.resolve(1), 100);
    await new Promise((r) => setTimeout(r, 150));
  });
});
