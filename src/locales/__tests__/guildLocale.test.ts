import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_LOCALE } from '../types.js';

const getGuildSettings = vi.fn();

vi.mock('../../features/admin/repositories/settingsRepository.js', () => ({
  settingsRepository: {
    getGuildSettings: (guildId: string) => getGuildSettings(guildId),
  },
}));

const { LANGUAGE_AUTO, getGuildLanguage, resolveGuildLocale, resolveLocale } =
  await import('../guildLocale.js');

function settings(language: string | null) {
  return {
    guild_id: 'g1',
    language,
    audit_channel_id: null,
    created_at: 0,
    updated_at: 0,
  };
}

describe('getGuildLanguage', () => {
  beforeEach(() => {
    getGuildSettings.mockReset();
  });

  it('returns the configured language', () => {
    getGuildSettings.mockReturnValue(settings('en'));
    expect(getGuildLanguage('g1')).toBe('en');
  });

  it('returns null when the guild follows the viewer (NULL)', () => {
    getGuildSettings.mockReturnValue(settings(null));
    expect(getGuildLanguage('g1')).toBeNull();
  });

  it('returns null when the guild has no settings row', () => {
    getGuildSettings.mockReturnValue(null);
    expect(getGuildLanguage('g1')).toBeNull();
  });

  it('ignores an unsupported stored language', () => {
    getGuildSettings.mockReturnValue(settings('ko'));
    expect(getGuildLanguage('g1')).toBeNull();
  });

  it('returns null without querying for DM interactions', () => {
    expect(getGuildLanguage(null)).toBeNull();
    expect(getGuildSettings).not.toHaveBeenCalled();
  });

  it('degrades to null when the database throws', () => {
    getGuildSettings.mockImplementation(() => {
      throw new Error('no such table: guild_settings');
    });
    expect(getGuildLanguage('g1')).toBeNull();
  });
});

describe('resolveGuildLocale', () => {
  beforeEach(() => {
    getGuildSettings.mockReset();
  });

  it('prefers the guild setting over the fallback', () => {
    getGuildSettings.mockReturnValue(settings('en'));
    expect(resolveGuildLocale('g1', 'ja')).toBe('en');
  });

  it('uses the fallback when the guild is on automatic', () => {
    getGuildSettings.mockReturnValue(settings(null));
    expect(resolveGuildLocale('g1', 'en')).toBe('en');
  });
});

describe('resolveLocale', () => {
  beforeEach(() => {
    getGuildSettings.mockReset();
  });

  it('answers in the guild language even for a differently-configured user', () => {
    getGuildSettings.mockReturnValue(settings('en'));
    expect(resolveLocale({ guildId: 'g1', locale: 'ja' })).toBe('en');
  });

  it('falls back to the user locale on automatic', () => {
    getGuildSettings.mockReturnValue(settings(null));
    expect(resolveLocale({ guildId: 'g1', locale: 'en-US' })).toBe('en');
  });

  it('uses the user locale in DMs', () => {
    expect(resolveLocale({ guildId: null, locale: 'en-GB' })).toBe('en');
    expect(getGuildSettings).not.toHaveBeenCalled();
  });

  it('falls back to DEFAULT_LOCALE for unsupported user locales', () => {
    getGuildSettings.mockReturnValue(null);
    expect(resolveLocale({ guildId: 'g1', locale: 'fr' })).toBe(DEFAULT_LOCALE);
  });

  it('exposes the automatic sentinel used by the settings command', () => {
    expect(LANGUAGE_AUTO).toBe('auto');
  });
});
