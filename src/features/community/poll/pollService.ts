import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
} from 'discord.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS, PROGRESS_BAR } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { pollStore, type PollData } from './pollStore.js';

function generateProgressBar(percentage: number): string {
  const filled = Math.round((percentage / 100) * PROGRESS_BAR.LENGTH);
  const empty = PROGRESS_BAR.LENGTH - filled;
  return PROGRESS_BAR.FILLED.repeat(filled) + PROGRESS_BAR.EMPTY.repeat(empty);
}

export function buildPollResultEmbed(
  poll: PollData,
  ended: boolean = false
): ReturnType<typeof createEmbed> {
  const locale = poll.locale;
  const totalVotes = poll.votes.size;

  const voteCounts = poll.options.map((_, index) => {
    let count = 0;
    poll.votes.forEach((vote) => {
      if (vote === index) count++;
    });
    return count;
  });

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
  if (!ended && poll.endsAt) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((poll.endsAt - Date.now()) / 60_000)
    );
    footerParts.push(t('poll.endsIn', locale, { duration: remainingMinutes }));
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

export function buildPollButtons(
  poll: PollData,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  poll.options.forEach((_option, index) => {
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

export async function handlePollVote(
  interaction: ButtonInteraction
): Promise<void> {
  const messageId = interaction.message.id;
  const poll = pollStore.get(messageId);

  if (!poll || poll.ended) {
    const locale = resolveLocale(interaction);
    await interaction.reply({
      content: t('poll.errors.pollEndedDesc', locale),
      ephemeral: true,
    });
    return;
  }

  const locale = resolveLocale(interaction);
  const optionIndex = Number.parseInt(interaction.customId.split('_')[2], 10);

  if (
    Number.isNaN(optionIndex) ||
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
  poll.votes.set(userId, optionIndex);

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

  await interaction.reply({
    content: responseMessage,
    ephemeral: true,
  });

  // Finalization may have started while we awaited the vote ack — do not
  // overwrite the ended embed / re-open the live tally view.
  if (poll.ended || !pollStore.has(messageId)) {
    return;
  }

  const embed = buildPollResultEmbed(poll);
  await interaction.message
    .edit({ embeds: [embed] })
    .catch((error: unknown) => {
      logger.debug(`Failed to update poll message: ${getErrorMessage(error)}`);
    });
}

export async function endPoll(
  messageId: string,
  client?: Client
): Promise<void> {
  const poll = pollStore.get(messageId);
  if (!poll) return;

  if (poll.timeout) {
    clearTimeout(poll.timeout);
    poll.timeout = undefined;
  }

  // Block further votes before any await so late clicks cannot mutate the
  // tally after finalization has begun (and cannot race-edit the message).
  poll.ended = true;

  const discordClient = client ?? poll.client;

  try {
    const channel = discordClient?.channels.cache.get(poll.channelId);
    if (channel && channel.isTextBased() && 'messages' in channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        // Message is gone — nothing left to publish; drop the store entry.
        pollStore.delete(messageId);
        return;
      }

      const embed = buildPollResultEmbed(poll, true);
      const disabledButtons = buildPollButtons(poll, true);
      await message.edit({
        embeds: [embed],
        components: disabledButtons,
      });
      logger.info(`Poll ended: ${poll.question} (${poll.votes.size} votes)`);
      pollStore.delete(messageId);
      return;
    }

    // Keep the ended poll so a later retry (manual /poll end) can publish
    // results instead of silently discarding the only copy of the votes.
    logger.warn(
      `Poll end deferred; channel not available for message ${messageId}`
    );
  } catch (error) {
    logger.error('Error ending poll:', getErrorMessage(error));
  }
}

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
