import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../types/index.js';
import { ExtendedClient } from '../../client.js';
import { runMiddleware } from '../../middleware/index.js';
import { getErrorMessage, logger } from '../../utils/logger.js';
import { createErrorEmbed } from '../../utils/embed.js';
import { metrics } from '../../services/metrics/index.js';

/**
 * InteractionCreate event - handles slash command and autocomplete interactions
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(client, interaction) {
    if (!(client as ExtendedClient).isFullyReady) return;
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        await interaction.respond([]).catch((e: unknown) => {
          logger.debug(
            `Failed to respond to autocomplete: ${getErrorMessage(e)}`
          );
        });
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(
          `Autocomplete error for ${interaction.commandName}:`,
          error
        );
        await interaction.respond([]).catch((e: unknown) => {
          logger.debug(
            `Failed to respond to autocomplete error: ${getErrorMessage(e)}`
          );
        });
      }
      return;
    }

    // Only handle chat input commands (slash commands)
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      // Run middleware checks
      const passed = await runMiddleware(interaction, command);
      if (!passed) return;

      // Execute the command
      await command.execute(interaction);

      // Track successful command execution
      metrics.incrementCommand(interaction.commandName);

      logger.debug(
        `Command executed: ${interaction.commandName} by ${interaction.user.tag}`
      );
    } catch (error) {
      // Track command error
      metrics.incrementError(interaction.commandName);

      logger.error(
        `Error executing command ${interaction.commandName}:`,
        error
      );

      // Send error message to user
      const errorEmbed = createErrorEmbed(
        'Error',
        'An error occurred while executing this command.'
      );

      if (interaction.deferred || interaction.replied) {
        await interaction
          .editReply({ embeds: [errorEmbed] })
          .catch((e: unknown) => {
            logger.debug(
              `Failed to edit reply with error embed: ${getErrorMessage(e)}`
            );
          });
      } else {
        await interaction
          .reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral })
          .catch((e: unknown) => {
            logger.debug(
              `Failed to reply with error embed: ${getErrorMessage(e)}`
            );
          });
      }
    }
  },
};

export default event;
