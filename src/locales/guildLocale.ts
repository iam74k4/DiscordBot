import { settingsRepository } from '../features/admin/repositories/settingsRepository.js';
import { logger } from '../shared/utils/logger.js';
import { mapDiscordLocale } from './index.js';
import { SUPPORTED_LOCALES, type Locale } from './types.js';

/**
 * Value stored in `guild_settings.language` meaning "follow the viewer".
 * Persisted as NULL so a guild that never chose a language keeps the
 * per-user behaviour the bot had before guild languages were honoured.
 */
export const LANGUAGE_AUTO = 'auto';

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
  );
}

/**
 * Language configured for a guild, or null when it follows the viewer.
 * Never throws: a database failure degrades to "auto" rather than taking
 * down the interaction that asked for a translated string.
 */
export function getGuildLanguage(
  guildId: string | null | undefined
): Locale | null {
  if (!guildId) return null;

  try {
    const language = settingsRepository.getGuildSettings(guildId)?.language;
    return isLocale(language) ? language : null;
  } catch (error) {
    logger.debug(`Failed to read guild language for ${guildId}: ${error}`);
    return null;
  }
}

/**
 * Resolve the locale for guild-directed output (notifications, audit logs).
 * Guild setting wins; otherwise the caller's fallback applies.
 */
export function resolveGuildLocale(
  guildId: string | null | undefined,
  fallback: Locale
): Locale {
  return getGuildLanguage(guildId) ?? fallback;
}

/**
 * Resolve the locale for a reply to an interaction.
 * Precedence: guild setting > the user's Discord client language > default.
 * In DMs there is no guild, so the user's language always wins.
 */
export function resolveLocale(interaction: {
  guildId: string | null;
  locale: string;
}): Locale {
  return resolveGuildLocale(
    interaction.guildId,
    mapDiscordLocale(interaction.locale)
  );
}
