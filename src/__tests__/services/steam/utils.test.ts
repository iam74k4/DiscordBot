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
  describe('with Japanese locale', () => {
    it('should return "0分" for 0 minutes', () => {
      expect(formatPlaytime(0, 'ja')).toBe('0分');
    });

    it('should format minutes only', () => {
      expect(formatPlaytime(30, 'ja')).toBe('30分');
      expect(formatPlaytime(59, 'ja')).toBe('59分');
    });

    it('should format hours only', () => {
      expect(formatPlaytime(60, 'ja')).toBe('1時間');
      expect(formatPlaytime(120, 'ja')).toBe('2時間');
    });

    it('should format hours and minutes', () => {
      expect(formatPlaytime(90, 'ja')).toBe('1時間 30分');
      expect(formatPlaytime(150, 'ja')).toBe('2時間 30分');
    });

    it('should format large numbers with locale', () => {
      const result = formatPlaytime(60000, 'ja'); // 1000 hours
      expect(result).toContain('1,000時間');
    });
  });

  describe('with English locale', () => {
    it('should return "0min" for 0 minutes', () => {
      expect(formatPlaytime(0, 'en')).toBe('0min');
    });

    it('should format minutes only', () => {
      expect(formatPlaytime(30, 'en')).toBe('30min');
    });

    it('should format hours only', () => {
      expect(formatPlaytime(60, 'en')).toBe('1hours');
    });

    it('should format hours and minutes', () => {
      expect(formatPlaytime(90, 'en')).toBe('1h 30m');
    });
  });
});

describe('getStatusText', () => {
  it('should return correct Japanese text for each state', () => {
    expect(getStatusText(PersonaState.Offline, 'ja')).toBe('オフライン');
    expect(getStatusText(PersonaState.Online, 'ja')).toBe('オンライン');
    expect(getStatusText(PersonaState.Busy, 'ja')).toBe('取り込み中');
    expect(getStatusText(PersonaState.Away, 'ja')).toBe('離席中');
    expect(getStatusText(PersonaState.Snooze, 'ja')).toBe('スヌーズ');
    expect(getStatusText(PersonaState.LookingToTrade, 'ja')).toBe('トレード希望');
    expect(getStatusText(PersonaState.LookingToPlay, 'ja')).toBe('プレイ希望');
  });

  it('should return "不明" for unknown state (ja)', () => {
    expect(getStatusText(999 as PersonaState, 'ja')).toBe('不明');
  });

  it('should return correct English text for each state', () => {
    expect(getStatusText(PersonaState.Offline, 'en')).toBe('Offline');
    expect(getStatusText(PersonaState.Online, 'en')).toBe('Online');
    expect(getStatusText(PersonaState.Busy, 'en')).toBe('Busy');
    expect(getStatusText(PersonaState.Away, 'en')).toBe('Away');
    expect(getStatusText(PersonaState.Snooze, 'en')).toBe('Snooze');
    expect(getStatusText(PersonaState.LookingToTrade, 'en')).toBe('Looking to Trade');
    expect(getStatusText(PersonaState.LookingToPlay, 'en')).toBe('Looking to Play');
  });

  it('should return "Unknown" for unknown state (en)', () => {
    expect(getStatusText(999 as PersonaState, 'en')).toBe('Unknown');
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
    const result = formatTimestamp(timestamp, 'ja');
    // `formatTimestamp` uses local timezone via `toLocaleDateString`,
    // so derive expected parts from the local Date rather than assuming UTC.
    const date = new Date(timestamp * 1000);
    const expectedYear = date.getFullYear();
    const expectedMonth = date.getMonth() + 1; // 1-12
    const expectedDay = date.getDate(); // local day of month

    expect(result).toContain(`${expectedYear}年`);
    expect(result).toContain(`${expectedMonth}月`);
    expect(result).toContain(`${expectedDay}日`);
  });

  it('should format Unix timestamp to English date', () => {
    const timestamp = 1705276800;
    const result = formatTimestamp(timestamp, 'en');
    const date = new Date(timestamp * 1000);
    const expectedYear = date.getFullYear();

    expect(result).toContain(String(expectedYear));
    // English format contains month name (January, etc.)
    expect(result).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
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
  it('should include both bar and time (ja)', () => {
    const result = formatPlaytimeWithBar(60, 120, 'ja');
    expect(result).toContain('█');
    expect(result).toContain('時間');
  });

  it('should handle 0 max value (ja)', () => {
    const result = formatPlaytimeWithBar(0, 0, 'ja');
    expect(result).toContain('░');
    expect(result).toContain('0分');
  });

  it('should include both bar and time (en)', () => {
    const result = formatPlaytimeWithBar(60, 120, 'en');
    expect(result).toContain('█');
    expect(result).toContain('hours');
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
