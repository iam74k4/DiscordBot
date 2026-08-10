import { en } from './en.js';
import { ja } from './ja.js';
import {
  Locale,
  DEFAULT_LOCALE,
  TranslationKeys,
  TranslationKey,
} from './types.js';

export type { Locale, TranslationKeys, TranslationKey } from './types.js';

/**
 * Translation dictionary
 */
const translations: Record<Locale, TranslationKeys> = {
  en,
  ja,
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
