import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../../types/index.js';
import { logger } from '../../../utils/logger.js';
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
  },
};

export default event;
