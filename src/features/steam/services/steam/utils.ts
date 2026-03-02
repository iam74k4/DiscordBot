import { PersonaState, CommunityVisibilityState } from './types.js';
import {
  STEAM_STATUS,
  PROGRESS_BAR,
  COLORS,
} from '../../../../utils/constants/index.js';
import { ColorResolvable } from 'discord.js';
import { t, Locale, DEFAULT_LOCALE } from '../../../../locales/index.js';

/**
 * Steam ID regex patterns
 */
const STEAM_ID_64_PATTERN = /^[0-9]{17}$/;
const VANITY_URL_PATTERN = /^https?:\/\/steamcommunity\.com\/id\/([^/]+)\/?$/;
const PROFILE_URL_PATTERN =
  /^https?:\/\/steamcommunity\.com\/profiles\/([0-9]{17})\/?$/;

/**
 * Parse Steam ID from various input formats
 * @returns Steam ID 64 or vanity name
 */
export function parseSteamInput(input: string): {
  type: 'steamid64' | 'vanity';
  value: string;
} {
  const trimmed = input.trim();

  // Check if it's a 64-bit Steam ID
  if (STEAM_ID_64_PATTERN.test(trimmed)) {
    return { type: 'steamid64', value: trimmed };
  }

  // Check if it's a profile URL with Steam ID
  const profileMatch = trimmed.match(PROFILE_URL_PATTERN);
  if (profileMatch) {
    return { type: 'steamid64', value: profileMatch[1] };
  }

  // Check if it's a vanity URL
  const vanityMatch = trimmed.match(VANITY_URL_PATTERN);
  if (vanityMatch) {
    return { type: 'vanity', value: vanityMatch[1] };
  }

  // Assume it's a vanity name
  return { type: 'vanity', value: trimmed };
}

/**
 * Format playtime in minutes to human readable string
 * @param minutes Playtime in minutes
 * @param locale Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted string like "1,234h 30m" or "1,234時間 30分"
 */
export function formatPlaytime(
  minutes: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (minutes === 0) {
    return `0${t('units.minutes', locale)}`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // Use locale-specific number formatting
  const numberLocale = locale === 'ja' ? 'ja-JP' : 'en-US';

  if (hours === 0) {
    return `${mins}${t('units.minutes', locale)}`;
  }

  const formattedHours = hours.toLocaleString(numberLocale);

  if (mins === 0) {
    return `${formattedHours}${t('units.hours', locale)}`;
  }

  return t('units.hoursAndMinutes', locale, {
    hours: formattedHours,
    minutes: String(mins),
  });
}

/**
 * Get status text from PersonaState
 * @param state Steam persona state
 * @param locale Locale for translation (defaults to DEFAULT_LOCALE)
 */
export function getStatusText(
  state: PersonaState,
  locale: Locale = DEFAULT_LOCALE
): string {
  switch (state) {
    case PersonaState.Offline:
      return t('steam.status.offline', locale);
    case PersonaState.Online:
      return t('steam.status.online', locale);
    case PersonaState.Busy:
      return t('steam.status.busy', locale);
    case PersonaState.Away:
      return t('steam.status.away', locale);
    case PersonaState.Snooze:
      return t('steam.status.snooze', locale);
    case PersonaState.LookingToTrade:
      return t('steam.status.lookingToTrade', locale);
    case PersonaState.LookingToPlay:
      return t('steam.status.lookingToPlay', locale);
    default:
      return t('steam.status.unknown', locale);
  }
}

/**
 * Get status indicator for PersonaState (text-based)
 */
export function getStatusIndicator(state: PersonaState): string {
  switch (state) {
    case PersonaState.Offline:
      return STEAM_STATUS.OFFLINE;
    case PersonaState.Online:
      return STEAM_STATUS.ONLINE;
    case PersonaState.Busy:
      return STEAM_STATUS.BUSY;
    case PersonaState.Away:
      return STEAM_STATUS.AWAY;
    case PersonaState.Snooze:
      return STEAM_STATUS.AWAY;
    case PersonaState.LookingToTrade:
      return STEAM_STATUS.ONLINE;
    case PersonaState.LookingToPlay:
      return STEAM_STATUS.ONLINE;
    default:
      return STEAM_STATUS.OFFLINE;
  }
}

/**
 * Get status color for PersonaState
 */
export function getStatusColor(
  state: PersonaState,
  isInGame: boolean = false
): ColorResolvable {
  if (isInGame) {
    return COLORS.STEAM_INGAME;
  }

  switch (state) {
    case PersonaState.Online:
    case PersonaState.LookingToTrade:
    case PersonaState.LookingToPlay:
      return COLORS.STEAM_ONLINE;
    case PersonaState.Busy:
    case PersonaState.Away:
    case PersonaState.Snooze:
      return COLORS.WARNING;
    case PersonaState.Offline:
    default:
      return COLORS.STEAM_OFFLINE;
  }
}

/**
 * Check if profile is public
 */
export function isProfilePublic(state: CommunityVisibilityState): boolean {
  return state === CommunityVisibilityState.Public;
}

/**
 * Get game icon URL
 */
export function getGameIconUrl(appId: number, iconHash: string): string {
  if (!iconHash) {
    return '';
  }
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`;
}

/**
 * Get Steam store URL for a game
 */
export function getStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`;
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '';
  }

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Format Unix timestamp to locale date string
 * @param timestamp Unix timestamp in seconds
 * @param locale Locale for formatting (defaults to DEFAULT_LOCALE)
 */
export function formatTimestamp(
  timestamp: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  return new Date(timestamp * 1000).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create a visual progress bar
 */
export function createProgressBar(
  current: number,
  max: number,
  length: number = PROGRESS_BAR.LENGTH
): string {
  // Prevent division by zero when max is 0
  const percentage = max > 0 ? Math.min(current / max, 1) : 0;
  const filled = Math.round(percentage * length);
  const empty = length - filled;

  return PROGRESS_BAR.FILLED.repeat(filled) + PROGRESS_BAR.EMPTY.repeat(empty);
}

/**
 * Format playtime with visual bar for comparison
 * @param minutes Playtime in minutes
 * @param maxMinutes Maximum playtime for bar calculation
 * @param locale Locale for formatting (defaults to DEFAULT_LOCALE)
 */
export function formatPlaytimeWithBar(
  minutes: number,
  maxMinutes: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  const bar = createProgressBar(minutes, maxMinutes, 8);
  const time = formatPlaytime(minutes, locale);
  return `${bar} ${time}`;
}

/**
 * Get visibility text
 */
export function getVisibilityIcon(isPublic: boolean): string {
  return isPublic ? STEAM_STATUS.PUBLIC : STEAM_STATUS.PRIVATE;
}

/**
 * Format large number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Create section header for embed fields
 */
export function createSectionHeader(icon: string, title: string): string {
  return `${icon} **${title}**`;
}
