/**
 * Shared utilities and types for Steam commands
 */
import {
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Locale, t } from '../../../locales/index.js';
import { steamClient } from '../services/steam/index.js';
import { steamUserRepository } from '../repositories/index.js';
import { LRUCache } from '../../../utils/lruCache.js';

// ============ Constants ============

export const GAMES_PER_PAGE = 10;
export const USERS_PER_PAGE = 10;
export const ONE_DAY = 24 * 60 * 60 * 1000;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = 30 * ONE_DAY;
export const THREE_MONTHS = 90 * ONE_DAY;
export const SIX_MONTHS = 180 * ONE_DAY;
export const ONE_YEAR = 365 * ONE_DAY;

// Cache configuration
export const MAX_GAME_CACHE_ENTRIES = 500;
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============ Cache ============

export interface GameCacheEntry {
  games: { name: string; playtime: number }[];
  timestamp: number;
}

export const gameCache = new LRUCache<string, GameCacheEntry>(
  MAX_GAME_CACHE_ENTRIES
);

export const userCache: {
  users: { name: string; steamId: string }[];
  timestamp: number;
} = { users: [], timestamp: 0 };

// ============ Helper Functions ============

/**
 * Format hours for autocomplete display
 */
export function formatHoursShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k h`;
  }
  return `${hours.toLocaleString()}h`;
}

/**
 * Get Steam ID from interaction options
 */
export async function resolveSteamId(
  interaction: ChatInputCommandInteraction,
  locale: Locale,
  requireRegistration: boolean = false
): Promise<{ steamId: string | null; error?: string }> {
  const inputSteamId = interaction.options.getString('steamid');
  const targetUser = interaction.options.getUser('user');

  if (inputSteamId) {
    const steamId = await steamClient.getSteamId64(inputSteamId);
    if (!steamId) {
      return { steamId: null, error: t('steam.errors.invalidSteamId', locale) };
    }
    return { steamId };
  }

  if (targetUser) {
    const steamId = steamUserRepository.getSteamId(targetUser.id);
    if (!steamId) {
      return {
        steamId: null,
        error: t('steam.errors.userNotLinked', locale, {
          name: targetUser.displayName,
        }),
      };
    }
    return { steamId };
  }

  const steamId = steamUserRepository.getSteamId(interaction.user.id);
  if (!steamId && requireRegistration) {
    return {
      steamId: null,
      error: t('steam.errors.notLinked', locale),
    };
  }

  return { steamId };
}

/**
 * Build pagination buttons
 */
export function buildButtons(
  page: number,
  totalPages: number,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('first')
      .setLabel('<<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('<')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('page')
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('>')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('last')
      .setLabel('>>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1)
  );
}
