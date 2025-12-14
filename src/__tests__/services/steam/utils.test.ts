import { describe, it, expect } from 'vitest';
import {
  parseSteamInput,
  formatPlaytime,
  getStatusText,
  getStatusIndicator,
  isProfilePublic,
  getGameIconUrl,
  getStoreUrl,
  getCountryFlag,
  formatTimestamp,
  createProgressBar,
  formatPlaytimeWithBar,
  formatNumber,
} from '../../../services/steam/utils.js';
import {
  PersonaState,
  CommunityVisibilityState,
} from '../../../services/steam/types.js';

describe('parseSteamInput', () => {
  it('should parse 17-digit Steam ID 64', () => {
    const result = parseSteamInput('76561198012345678');
    expect(result.type).toBe('steamid64');
    expect(result.value).toBe('76561198012345678');
  });

  it('should parse Steam profile URL with ID', () => {
    const result = parseSteamInput(
      'https://steamcommunity.com/profiles/76561198012345678'
    );
    expect(result.type).toBe('steamid64');
    expect(result.value).toBe('76561198012345678');
  });

  it('should parse Steam profile URL with trailing slash', () => {
    const result = parseSteamInput(
      'https://steamcommunity.com/profiles/76561198012345678/'
    );
    expect(result.type).toBe('steamid64');
    expect(result.value).toBe('76561198012345678');
  });

  it('should parse Steam vanity URL', () => {
    const result = parseSteamInput('https://steamcommunity.com/id/gaben');
    expect(result.type).toBe('vanity');
    expect(result.value).toBe('gaben');
  });

  it('should parse vanity URL with trailing slash', () => {
    const result = parseSteamInput('https://steamcommunity.com/id/gaben/');
    expect(result.type).toBe('vanity');
    expect(result.value).toBe('gaben');
  });

  it('should treat plain text as vanity name', () => {
    const result = parseSteamInput('gaben');
    expect(result.type).toBe('vanity');
    expect(result.value).toBe('gaben');
  });

  it('should trim whitespace', () => {
    const result = parseSteamInput('  76561198012345678  ');
    expect(result.type).toBe('steamid64');
    expect(result.value).toBe('76561198012345678');
  });
});

describe('formatPlaytime', () => {
  it('should return "0分" for 0 minutes', () => {
    expect(formatPlaytime(0)).toBe('0分');
  });

  it('should format minutes only', () => {
    expect(formatPlaytime(30)).toBe('30分');
    expect(formatPlaytime(59)).toBe('59分');
  });

  it('should format hours only', () => {
    expect(formatPlaytime(60)).toBe('1時間');
    expect(formatPlaytime(120)).toBe('2時間');
  });

  it('should format hours and minutes', () => {
    expect(formatPlaytime(90)).toBe('1時間 30分');
    expect(formatPlaytime(150)).toBe('2時間 30分');
  });

  it('should format large numbers with locale', () => {
    const result = formatPlaytime(60000); // 1000 hours
    expect(result).toContain('1,000時間');
  });
});

describe('getStatusText', () => {
  it('should return correct Japanese text for each state', () => {
    expect(getStatusText(PersonaState.Offline)).toBe('オフライン');
    expect(getStatusText(PersonaState.Online)).toBe('オンライン');
    expect(getStatusText(PersonaState.Busy)).toBe('取り込み中');
    expect(getStatusText(PersonaState.Away)).toBe('離席中');
    expect(getStatusText(PersonaState.Snooze)).toBe('スヌーズ');
    expect(getStatusText(PersonaState.LookingToTrade)).toBe('トレード希望');
    expect(getStatusText(PersonaState.LookingToPlay)).toBe('プレイ希望');
  });

  it('should return "不明" for unknown state', () => {
    expect(getStatusText(999 as PersonaState)).toBe('不明');
  });
});

describe('getStatusIndicator', () => {
  it('should return indicator for each state', () => {
    expect(getStatusIndicator(PersonaState.Online)).toBe('Online');
    expect(getStatusIndicator(PersonaState.Offline)).toBe('Offline');
    expect(getStatusIndicator(PersonaState.Away)).toBe('Away');
    expect(getStatusIndicator(PersonaState.Busy)).toBe('Busy');
  });
});

describe('isProfilePublic', () => {
  it('should return true for public profile', () => {
    expect(isProfilePublic(CommunityVisibilityState.Public)).toBe(true);
  });

  it('should return false for private profile', () => {
    expect(isProfilePublic(CommunityVisibilityState.Private)).toBe(false);
  });

  it('should return false for friends only profile', () => {
    expect(isProfilePublic(CommunityVisibilityState.FriendsOnly)).toBe(false);
  });
});

describe('getGameIconUrl', () => {
  it('should return valid URL for icon hash', () => {
    const url = getGameIconUrl(730, 'abc123');
    expect(url).toBe(
      'https://media.steampowered.com/steamcommunity/public/images/apps/730/abc123.jpg'
    );
  });

  it('should return empty string for empty icon hash', () => {
    expect(getGameIconUrl(730, '')).toBe('');
  });
});

describe('getStoreUrl', () => {
  it('should return valid store URL', () => {
    expect(getStoreUrl(730)).toBe('https://store.steampowered.com/app/730');
  });
});

describe('getCountryFlag', () => {
  it('should return flag emoji for valid country code', () => {
    expect(getCountryFlag('JP')).toBe('🇯🇵');
    expect(getCountryFlag('US')).toBe('🇺🇸');
    expect(getCountryFlag('GB')).toBe('🇬🇧');
  });

  it('should return empty string for invalid country code', () => {
    expect(getCountryFlag('')).toBe('');
    expect(getCountryFlag('J')).toBe('');
    expect(getCountryFlag('JPN')).toBe('');
  });

  it('should handle lowercase country codes', () => {
    expect(getCountryFlag('jp')).toBe('🇯🇵');
  });
});

describe('formatTimestamp', () => {
  it('should format Unix timestamp to Japanese date', () => {
    // 2024-01-15 00:00:00 UTC
    const timestamp = 1705276800;
    const result = formatTimestamp(timestamp);
    expect(result).toContain('2024');
    expect(result).toContain('1');
    expect(result).toContain('15');
  });
});

describe('createProgressBar', () => {
  it('should create full bar for max value', () => {
    const bar = createProgressBar(100, 100, 10);
    expect(bar).toBe('██████████');
  });

  it('should create empty bar for 0 value', () => {
    const bar = createProgressBar(0, 100, 10);
    expect(bar).toBe('░░░░░░░░░░');
  });

  it('should create half bar for 50%', () => {
    const bar = createProgressBar(50, 100, 10);
    expect(bar).toBe('█████░░░░░');
  });

  it('should handle max being 0 (prevent division by zero)', () => {
    const bar = createProgressBar(0, 0, 10);
    expect(bar).toBe('░░░░░░░░░░');
  });

  it('should handle current greater than max', () => {
    const bar = createProgressBar(150, 100, 10);
    expect(bar).toBe('██████████');
  });

  it('should use default length when not specified', () => {
    const bar = createProgressBar(50, 100);
    expect(bar.length).toBe(10); // PROGRESS_BAR.LENGTH default
  });
});

describe('formatPlaytimeWithBar', () => {
  it('should include both bar and time', () => {
    const result = formatPlaytimeWithBar(60, 120);
    expect(result).toContain('█');
    expect(result).toContain('時間');
  });

  it('should handle 0 max value', () => {
    const result = formatPlaytimeWithBar(0, 0);
    expect(result).toContain('░');
    expect(result).toContain('0分');
  });
});

describe('formatNumber', () => {
  it('should format small numbers as-is', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(1500000)).toBe('1.5M');
  });
});
