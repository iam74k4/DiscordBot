import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { COLORS } from './constants/index.js';

/**
 * Embed options
 */
interface EmbedOptions {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  timestamp?: boolean;
  thumbnail?: string;
  image?: string;
}

/**
 * Create a standard embed with consistent styling
 */
export function createEmbed(options: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? COLORS.PRIMARY);

  if (options.title) {
    embed.setTitle(options.title);
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

  if (options.timestamp) {
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
  description?: string
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.SUCCESS,
  });
}

/**
 * Create an error embed
 */
export function createErrorEmbed(
  title: string,
  description?: string
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.ERROR,
  });
}

/**
 * Create a warning embed
 */
export function createWarningEmbed(
  title: string,
  description?: string
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.WARNING,
  });
}

/**
 * Create an info embed
 */
export function createInfoEmbed(
  title: string,
  description?: string
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: COLORS.INFO,
  });
}
