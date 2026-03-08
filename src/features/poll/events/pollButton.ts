import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../../types/index.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';
import { createErrorEmbed } from '../../../utils/embed.js';
import { handlePollVote, pollStore } from '../services/index.js';

/**
 * Poll button interaction handler - handles poll vote button clicks
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(_client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('poll_vote_')) return;

    if (pollStore.has(interaction.message.id)) {
      try {
        await handlePollVote(interaction);
      } catch (error) {
        logger.error('Error handling poll vote:', error);
        const embed = createErrorEmbed(
          'Poll Error',
          'An error occurred while processing your vote.'
        );
        await interaction
          .reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          })
          .catch((e: unknown) => {
            logger.debug(
              `Failed to reply to poll vote error: ${getErrorMessage(e)}`
            );
          });
      }
    } else {
      const embed = createErrorEmbed(
        'Poll Ended',
        'This poll has ended or no longer exists.'
      );
      await interaction
        .reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        })
        .catch((e: unknown) => {
          logger.debug(`Failed to reply to ended poll: ${getErrorMessage(e)}`);
        });
    }
  },
};

export default event;
