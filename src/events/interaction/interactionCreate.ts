import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../types/index.js';
import { getCommand } from '../../handlers/commandHandler.js';
import { runMiddleware } from '../../middleware/index.js';
import { logger } from '../../utils/logger.js';
import { createErrorEmbed } from '../../utils/embed.js';
import { handlePollVote, pollStore } from '../../services/poll/index.js';
import { metrics } from '../../services/metrics/index.js';

/**
 * InteractionCreate event - handles slash command and autocomplete interactions
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(_client, interaction) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = getCommand(interaction.commandName);

      if (!command || !command.autocomplete) {
        await interaction.respond([]).catch((e) => {
          logger.debug(`Failed to respond to autocomplete: ${e.message}`);
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
        await interaction.respond([]).catch((e) => {
          logger.debug(`Failed to respond to autocomplete error: ${e.message}`);
        });
      }
      return;
    }

    // Handle button interactions (poll votes)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('poll_vote_')) {
        // Check if poll exists in store
        if (pollStore.has(interaction.message.id)) {
          try {
            await handlePollVote(interaction);
          } catch (error) {
            logger.error('Error handling poll vote:', error);
            await interaction
              .reply({
                content: 'An error occurred while processing your vote.',
                flags: MessageFlags.Ephemeral,
              })
              .catch((e) => {
                logger.debug(`Failed to reply to poll vote error: ${e.message}`);
              });
          }
        } else {
          await interaction
            .reply({
              content: 'This poll has ended or no longer exists.',
              flags: MessageFlags.Ephemeral,
            })
            .catch((e) => {
              logger.debug(`Failed to reply to ended poll: ${e.message}`);
            });
        }
      }
      return;
    }

    // Only handle chat input commands (slash commands)
    if (!interaction.isChatInputCommand()) return;

    const command = getCommand(interaction.commandName);

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
        await interaction.editReply({ embeds: [errorEmbed] }).catch((e) => {
          logger.debug(`Failed to edit reply with error embed: ${e.message}`);
        });
      } else {
        await interaction
          .reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral })
          .catch((e) => {
            logger.debug(`Failed to reply with error embed: ${e.message}`);
          });
      }
    }
  },
};

export default event;
