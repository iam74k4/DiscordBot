import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
  Command,
  MiddlewareRegistry,
  MiddlewareResult,
} from '../types/index.js';
import { permissionsMiddleware } from './permissions.js';
import { cooldownMiddleware } from './cooldown/index.js';
import { createErrorEmbed } from '../utils/embed.js';
import { getErrorMessage, logger } from '../utils/logger.js';
import { t, mapDiscordLocale } from '../locales/index.js';

const middlewareRegistry: MiddlewareRegistry = {
  permissions: permissionsMiddleware,
  cooldown: cooldownMiddleware,
};

/**
 * Run all middleware for a command.
 * @returns true if all middleware passed, false otherwise
 */
export async function runMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<boolean> {
  const middlewareNames = command.middleware ?? [];

  for (const name of middlewareNames) {
    const middleware = middlewareRegistry[name];

    if (!middleware) {
      logger.warn(`Unknown middleware: ${name}`);
      continue;
    }

    const result: MiddlewareResult = await middleware(interaction, command);

    if (!result.success) {
      const locale = mapDiscordLocale(interaction.locale);
      const embed = createErrorEmbed(
        t('common.commandBlocked', locale),
        result.message || t('common.noPermission', locale)
      );

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (e: unknown) {
        logger.debug(
          `Failed to send middleware rejection: ${getErrorMessage(e)}`
        );
      }

      return false;
    }
  }

  return true;
}

export { permissionsMiddleware } from './permissions.js';
export {
  cooldownMiddleware,
  clearCooldown,
  clearCommandCooldowns,
} from './cooldown/index.js';
