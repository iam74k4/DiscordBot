import { describe, it, expect, vi } from 'vitest';
import { handleApiError } from '../application/githubUtils.js';

vi.mock('../../../locales/index.js', () => ({
  t: (key: string) => key,
  mapDiscordLocale: () => 'en',
}));

describe('handleApiError', () => {
  it('returns translated message for 404', () => {
    const error = Object.assign(new Error('Not Found'), { status: 404 });
    const msg = handleApiError(error, 'en');
    expect(msg).toBeDefined();
    expect(typeof msg).toBe('string');
  });

  it('returns translated message for 403', () => {
    const error = Object.assign(new Error('Forbidden'), { status: 403 });
    const msg = handleApiError(error, 'en');
    expect(msg).toBeDefined();
    expect(typeof msg).toBe('string');
  });

  it('returns error message for generic Error', () => {
    const error = new Error('Something went wrong');
    expect(handleApiError(error, 'en')).toBe('Something went wrong');
  });
});
