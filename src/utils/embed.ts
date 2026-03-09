import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { COLORS } from './constants/index.js';

/**
 * Embed options
 */
interface EmbedOptions {
  title?: string;
  description?: string;
  url?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  timestamp?: boolean;
  thumbnail?: string;
  image?: string;
}

/**
 * Options for status embeds (success/error/warning/info)
 */
interface StatusEmbedOptions {
  footer?: string;
  timestamp?: boolean;
}

/**
 * Create a standard embed with consistent styling.
 * Timestamps are enabled by default; pass `timestamp: false` to disable.
 */
export function createEmbed(options: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? COLORS.PRIMARY);

  if (options.title) {
    embed.setTitle(options.title);
  }

  if (options.url) {
    embed.setURL(options.url);
  }

  if (options.description) {
    embed.setDescription(options.description);
  }

  if (options.fields) {
    embed.addFields(options.fields);
  }

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  if (options.timestamp !== false) {
    embed.setTimestamp();
  }

  if (options.thumbnail) {
    embed.setThumbnail(options.thumbnail);
  }

  if (options.image) {
    embed.setImage(options.image);
  }

  return embed;
}

/**
 * Create a success embed
 */
export function createSuccessEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.SUCCESS,
    footer: options?.footer,
    timestamp: options?.timestamp,
  });
}

/**
 * Create an error embed
 */
export function createErrorEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.ERROR,
    footer: options?.footer,
    timestamp: options?.timestamp,
  });
}

/**
 * Create a warning embed
 */
export function createWarningEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.WARNING,
    footer: options?.footer,
    timestamp: options?.timestamp,
  });
}

/**
 * Create an info embed
 */
export function createInfoEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.INFO,
    footer: options?.footer,
    timestamp: options?.timestamp,
  });
}
