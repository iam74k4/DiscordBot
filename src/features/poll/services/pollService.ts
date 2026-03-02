import {
  ButtonInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { pollStore, PollData } from './pollStore.js';
import { createEmbed } from '../../../utils/embed.js';
import { COLORS, PROGRESS_BAR } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

/**
 * Generate progress bar for poll results
 */
function generateProgressBar(percentage: number): string {
  const filled = Math.round((percentage / 100) * PROGRESS_BAR.LENGTH);
  const empty = PROGRESS_BAR.LENGTH - filled;
  return PROGRESS_BAR.FILLED.repeat(filled) + PROGRESS_BAR.EMPTY.repeat(empty);
}

/**
 * Build poll result embed
 */
export function buildPollResultEmbed(
  poll: PollData,
  ended: boolean = false
): ReturnType<typeof createEmbed> {
  const locale = poll.locale;
  const totalVotes = poll.votes.size;

  // Count votes per option
  const voteCounts = poll.options.map((_, index) => {
    let count = 0;
    poll.votes.forEach((vote) => {
      if (vote === index) count++;
    });
    return count;
  });

  // Build result fields
  const fields = poll.options.map((option, index) => {
    const count = voteCounts[index];
    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
    const bar = generateProgressBar(percentage);

    return {
      name: `${index + 1}. ${option}`,
      value: `${bar} ${t('poll.votes', locale, { count })} (${percentage.toFixed(1)}%)`,
      inline: false,
    };
  });

  const footerParts: string[] = [];
  if (poll.anonymous) {
    footerParts.push(t('poll.anonymous', locale));
  }
  footerParts.push(t('poll.total', locale, { count: totalVotes }));

  return createEmbed({
    title: ended ? t('poll.ended', locale) : t('poll.title', locale),
    description: poll.question,
    color: ended ? COLORS.WARNING : COLORS.PRIMARY,
    fields,
    footer: footerParts.join(' | '),
    timestamp: true,
  });
}

/**
 * Build vote buttons for poll
 */
export function buildPollButtons(
  poll: PollData,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  poll.options.forEach((_option, index) => {
    // Max 5 buttons per row
    if (currentRow.components.length >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }

    const button = new ButtonBuilder()
      .setCustomId(`poll_vote_${index}`)
      .setLabel(`${index + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled);

    currentRow.addComponents(button);
  });

  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Handle vote button click
 */
export async function handlePollVote(
  interaction: ButtonInteraction
): Promise<void> {
  const messageId = interaction.message.id;
  const poll = pollStore.get(messageId);

  // Safety check (should not happen if caller verified)
  if (!poll) {
    return;
  }

  // Get voter's locale
  const locale = mapDiscordLocale(interaction.locale);

  // Extract option index from customId (poll_vote_0, poll_vote_1, etc.)
  const optionIndex = parseInt(interaction.customId.split('_')[2], 10);

  if (
    isNaN(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= poll.options.length
  ) {
    await interaction.reply({
      content: t('poll.errors.invalidOption', locale),
      ephemeral: true,
    });
    return;
  }

  const userId = interaction.user.id;
  const previousVote = poll.votes.get(userId);

  // Update vote
  poll.votes.set(userId, optionIndex);

  // Build response message
  let responseMessage: string;
  if (previousVote !== undefined && previousVote !== optionIndex) {
    responseMessage = t('poll.voteChanged', locale, {
      from: poll.options[previousVote],
      to: poll.options[optionIndex],
    });
  } else if (previousVote === optionIndex) {
    responseMessage = t('poll.alreadyVoted', locale, {
      option: poll.options[optionIndex],
    });
  } else {
    responseMessage = t('poll.votedFor', locale, {
      option: poll.options[optionIndex],
    });
  }

  // Acknowledge the vote
  await interaction.reply({
    content: responseMessage,
    ephemeral: true,
  });

  // Update the poll message with new results
  const embed = buildPollResultEmbed(poll);
  await interaction.message.edit({ embeds: [embed] }).catch((e) => {
    logger.debug(`Failed to update poll message: ${e.message}`);
  });
}

/**
 * End a poll and show final results
 */
export async function endPoll(
  messageId: string,
  client?: Client
): Promise<void> {
  const poll = pollStore.get(messageId);
  if (!poll) return;

  // Remove from store (clears timeout)
  pollStore.delete(messageId);

  // Use provided client or stored client
  const discordClient = client ?? poll.client;

  // Try to update the original message
  try {
    const channel = discordClient?.channels.cache.get(poll.channelId);
    if (channel && channel.isTextBased() && 'messages' in channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        const embed = buildPollResultEmbed(poll, true);
        const disabledButtons = buildPollButtons(poll, true);
        await message.edit({
          embeds: [embed],
          components: disabledButtons,
        });
        logger.info(`Poll ended: ${poll.question} (${poll.votes.size} votes)`);
      }
    }
  } catch (error) {
    logger.error('Error ending poll:', error);
  }
}

/**
 * Find user's active poll in a channel
 */
export function findUserPollInChannel(
  userId: string,
  channelId: string
): string | null {
  for (const [messageId, poll] of pollStore.entries()) {
    if (poll.creatorId === userId && poll.channelId === channelId) {
      return messageId;
    }
  }
  return null;
}
