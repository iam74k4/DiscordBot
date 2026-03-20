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

/** Status embed type */
type StatusType = 'success' | 'error' | 'warning' | 'info';

const STATUS_COLORS: Record<StatusType, ColorResolvable> = {
  success: COLORS.SUCCESS,
  error: COLORS.ERROR,
  warning: COLORS.WARNING,
  info: COLORS.INFO,
};

/**
 * Create a status embed (success/error/warning/info).
 * @internal
 */
function createStatusEmbed(
  type: StatusType,
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createEmbed({
    title,
    description,
    color: STATUS_COLORS[type],
    footer: options?.footer,
    timestamp: options?.timestamp,
  });
}

/**
 * Create a standard embed with consistent styling.
 * Timestamps are enabled by default; pass `timestamp: false` to disable.
 *
 * @param options - Embed configuration (title, description, color, fields, etc.)
 * @returns Configured EmbedBuilder instance
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

/** Create a success embed */
export function createSuccessEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createStatusEmbed('success', title, description, options);
}

/** Create an error embed */
export function createErrorEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createStatusEmbed('error', title, description, options);
}

/** Create a warning embed */
export function createWarningEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createStatusEmbed('warning', title, description, options);
}

/** Create an info embed */
export function createInfoEmbed(
  title: string,
  description?: string,
  options?: StatusEmbedOptions
): EmbedBuilder {
  return createStatusEmbed('info', title, description, options);
}
