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

/** Discord embed limits */
const EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
} as const;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

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
    embed.setTitle(truncate(options.title, EMBED_LIMITS.title));
  }

  if (options.url) {
    embed.setURL(options.url);
  }

  if (options.description) {
    embed.setDescription(
      truncate(options.description, EMBED_LIMITS.description)
    );
  }

  if (options.fields) {
    embed.addFields(
      options.fields.map((f) => ({
        name: truncate(f.name, EMBED_LIMITS.fieldName),
        value: truncate(f.value, EMBED_LIMITS.fieldValue),
        inline: f.inline,
      }))
    );
  }

  if (options.footer) {
    embed.setFooter({ text: truncate(options.footer, EMBED_LIMITS.footer) });
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
