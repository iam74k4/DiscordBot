import { ButtonInteraction, MessageFlags } from 'discord.js';
import { createErrorEmbed } from '../../../shared/utils/embed.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { mapDiscordLocale, t } from '../../../locales/index.js';
import { handlePollVote, pollStore } from './index.js';

export async function handleCommunityButtonInteraction(
  interaction: ButtonInteraction
): Promise<boolean> {
  if (!interaction.customId.startsWith('poll_vote_')) {
    return false;
  }

  const locale = mapDiscordLocale(interaction.locale);

  if (pollStore.has(interaction.message.id)) {
    try {
      await handlePollVote(interaction);
    } catch (error) {
      logger.error('Error handling poll vote:', getErrorMessage(error));
      const embed = createErrorEmbed(
        t('poll.errors.pollError', locale),
        t('poll.errors.pollErrorDesc', locale)
      );
      await interaction
        .reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        })
        .catch((replyError: unknown) => {
          logger.debug(
            `Failed to reply to poll vote error: ${getErrorMessage(replyError)}`
          );
        });
    }
    return true;
  }

  const embed = createErrorEmbed(
    t('poll.errors.pollEnded', locale),
    t('poll.errors.pollEndedDesc', locale)
  );
  await interaction
    .reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
    .catch((replyError: unknown) => {
      logger.debug(
        `Failed to reply to ended poll: ${getErrorMessage(replyError)}`
      );
    });
  return true;
}
