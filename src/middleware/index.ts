import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
  Command,
  MiddlewareRegistry,
  MiddlewareResult,
} from '../shared/types/index.js';
import { permissionsMiddleware } from './permissions.js';
import { cooldownMiddleware } from './cooldown/index.js';
import { createErrorEmbed } from '../shared/utils/embed.js';
import { getErrorMessage, logger } from '../shared/utils/logger.js';
import { t } from '../locales/index.js';
import { resolveLocale } from '../locales/guildLocale.js';

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
      const locale = resolveLocale(interaction);
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

export { clearCooldown } from './cooldown/index.js';
