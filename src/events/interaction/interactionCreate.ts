import { Events } from 'discord.js';
import { Event } from '../../types/index.js';
import { getCommand } from '../../handlers/commandHandler.js';
import { runMiddleware } from '../../middleware/index.js';
import { logger } from '../../utils/logger.js';
import { createErrorEmbed } from '../../utils/embed.js';

/**
 * InteractionCreate event - handles slash command interactions
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(_client, interaction) {
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

      logger.debug(
        `Command executed: ${interaction.commandName} by ${interaction.user.tag}`
      );
    } catch (error) {
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
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction
          .reply({ embeds: [errorEmbed], ephemeral: true })
          .catch(() => {});
      }
    }
  },
};

export default event;
