import { Locale as DiscordLocale } from 'discord.js';
import { en } from './en.js';
import { ja } from './ja.js';
import {
  Locale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  TranslationKeys,
  TranslationKey,
} from './types.js';

export type { Locale, TranslationKeys, TranslationKey } from './types.js';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types.js';

/**
 * Translation dictionary
 */
const translations: Record<Locale, TranslationKeys> = {
  en,
  ja,
};

/**
 * Mapping from our locale to Discord locale(s)
 * Used for command localizations (setNameLocalizations/setDescriptionLocalizations)
 *
 * When adding a new locale:
 * 1. Add mapping here: 'ko': [DiscordLocale.Korean]
 * 2. See Discord locale codes: https://discord.com/developers/docs/reference#locales
 */
const localeToDiscordLocales: Record<Locale, DiscordLocale[]> = {
  ja: [DiscordLocale.Japanese],
  en: [DiscordLocale.EnglishUS, DiscordLocale.EnglishGB],
};

/**
 * Map Discord locale to supported locale
 */
export function mapDiscordLocale(discordLocale: string): Locale {
  // Discord locale format: https://discord.com/developers/docs/reference#locales
  const localeMap: Record<string, Locale> = {
    ja: 'ja',
    'en-US': 'en',
    'en-GB': 'en',
  };

  return localeMap[discordLocale] ?? DEFAULT_LOCALE;
}

/**
 * Get value from nested object by dot-notation key
 */
function getNestedValue(obj: unknown, key: string): string | undefined {
  const keys = key.split('.');
  let result: unknown = obj;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }

  return typeof result === 'string' ? result : undefined;
}

/**
 * Replace placeholders in translation string
 * e.g., "Hello, {name}!" with { name: "World" } -> "Hello, World!"
 */
function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get translated string by key
 *
 * @param key - Translation key in dot notation (e.g., 'common.error')
 * @param locale - Target locale
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 *
 * @example
 * t('common.error', 'ja') // -> 'エラー'
 * t('roulette.member.footer', 'en', { count: 5, channel: 'General' })
 * // -> 'Selected from 5 members in General'
 */
export function t(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  // Try requested locale
  let value = getNestedValue(translations[locale], key);

  // Fallback to English
  if (value === undefined && locale !== 'en') {
    value = getNestedValue(translations.en, key);
  }

  // Fallback to key itself (for development/debugging)
  if (value === undefined) {
    return key;
  }

  return interpolate(value, params);
}

/**
 * Get translation object for a specific locale
 * Useful for accessing nested translations
 */
export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale];
}

/**
 * Discord.js Localizations format for command builders
 * Returns localization map for setNameLocalizations/setDescriptionLocalizations
 *
 * Automatically generates localizations for all supported locales.
 * When adding a new locale, just update `localeToDiscordLocales` mapping.
 */
export function getLocalizations(
  key: TranslationKey
): Partial<Record<DiscordLocale, string>> {
  const result: Partial<Record<DiscordLocale, string>> = {};

  for (const locale of SUPPORTED_LOCALES) {
    const value = getNestedValue(translations[locale], key);
    if (value) {
      const discordLocales = localeToDiscordLocales[locale];
      for (const discordLocale of discordLocales) {
        result[discordLocale] = value;
      }
    }
  }

  return result;
}

/**
 * Command description localizations helper
 * Creates localization object for slash command descriptions
 */
export interface CommandLocalizations {
  name: string;
  nameLocalizations?: Partial<Record<DiscordLocale, string>>;
  description: string;
  descriptionLocalizations: Partial<Record<DiscordLocale, string>>;
}

/**
 * Create command localizations from translation keys
 *
 * @param name - Command name (not localized, must be lowercase a-z)
 * @param descriptionKey - Translation key for description
 * @returns Command localizations object
 */
export function createCommandLocalizations(
  name: string,
  descriptionKey: TranslationKey
): CommandLocalizations {
  return {
    name,
    description: t(descriptionKey, 'en'),
    descriptionLocalizations: getLocalizations(descriptionKey),
  };
}
