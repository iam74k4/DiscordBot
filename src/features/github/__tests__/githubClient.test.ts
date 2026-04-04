import { describe, it, expect } from 'vitest';
import { parseRepo } from '../integrations/githubClient.js';

describe('parseRepo', () => {
  it('parses owner/repo format', () => {
    expect(parseRepo('iam74k4/DiscordBot')).toEqual({
      owner: 'iam74k4',
      repo: 'DiscordBot',
    });
  });

  it('returns null for invalid format', () => {
    expect(parseRepo('')).toBeNull();
    expect(parseRepo('single')).toBeNull();
    expect(parseRepo('a/b/c')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseRepo('  owner/repo  ')).toEqual({
      owner: 'owner',
      repo: 'repo',
    });
  });
});
