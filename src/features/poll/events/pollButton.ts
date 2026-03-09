import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../../types/index.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';
import { createErrorEmbed } from '../../../utils/embed.js';
import { handlePollVote, pollStore } from '../services/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

/**
 * Poll button interaction handler - handles poll vote button clicks
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(_client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('poll_vote_')) return;

    const locale = mapDiscordLocale(interaction.locale);

    if (pollStore.has(interaction.message.id)) {
      try {
        await handlePollVote(interaction);
      } catch (error) {
        logger.error('Error handling poll vote:', error);
        const embed = createErrorEmbed(
          t('poll.errors.pollError', locale),
          t('poll.errors.pollErrorDesc', locale)
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
        t('poll.errors.pollEnded', locale),
        t('poll.errors.pollEndedDesc', locale)
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
