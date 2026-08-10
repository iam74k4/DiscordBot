import {
  ChatInputCommandInteraction,
  MessageFlags,
  type Message,
  type PollAnswerData,
} from 'discord.js';
import { awaitConfirmation } from '../../../shared/utils/confirm.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, type Locale } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { pollRepository } from './pollRepository.js';

/** Highest option slot offered by `/community poll create`. */
const MAX_POLL_OPTIONS = 10;
/** Discord's limit on a poll question. */
const MAX_QUESTION_LENGTH = 300;
/** Discord's limit on each poll answer. Exported for the test that pins it. */
export const MAX_ANSWER_LENGTH = 55;
/** Used when the creator does not pick a duration. */
const DEFAULT_POLL_DURATION_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Read and validate the answers, or explain what is wrong.
 *
 * Discord rejects an over-long answer with an opaque API error, so the same
 * limits are checked here where the reply can name the problem.
 */
export function collectAnswers(
  optionAt: (index: number) => string | null
): { answers: PollAnswerData[] } | { error: 'tooLong' | 'notEnough' } {
  const answers: PollAnswerData[] = [];

  for (let i = 1; i <= MAX_POLL_OPTIONS; i++) {
    const option = optionAt(i);
    if (!option) continue;
    if (option.length > MAX_ANSWER_LENGTH) return { error: 'tooLong' };
    answers.push({ text: option });
  }

  if (answers.length < 2) return { error: 'notEnough' };
  return { answers };
}

async function replyError(
  interaction: ChatInputCommandInteraction,
  locale: Locale,
  titleKey: Parameters<typeof t>[0],
  bodyKey: Parameters<typeof t>[0]
): Promise<void> {
  await interaction.reply({
    embeds: [createErrorEmbed(t(titleKey, locale), t(bodyKey, locale))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCreatePoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  const question = interaction.options.getString('question', true);
  const hours =
    interaction.options.getInteger('duration') ?? DEFAULT_POLL_DURATION_HOURS;
  const allowMultiselect = interaction.options.getBoolean('multi') ?? false;

  if (question.length > MAX_QUESTION_LENGTH) {
    await replyError(
      interaction,
      locale,
      'common.error',
      'poll.errors.questionTooLong'
    );
    return;
  }

  const collected = collectAnswers((index) =>
    interaction.options.getString(`option${index}`)
  );
  if ('error' in collected) {
    await replyError(
      interaction,
      locale,
      'common.error',
      collected.error === 'tooLong'
        ? 'poll.errors.optionTooLong'
        : 'poll.errors.notEnoughOptions'
    );
    return;
  }

  // Discord renders, tallies, and closes the poll; the reply is the poll.
  const response = await interaction.reply({
    poll: {
      question: { text: question },
      answers: collected.answers,
      duration: hours,
      allowMultiselect,
    },
    withResponse: true,
  });

  const message = response.resource?.message;
  if (!message) {
    logger.error('Poll created but Discord returned no message to track');
    return;
  }

  // Only a pointer for `/community poll end`; the poll survives without it.
  try {
    pollRepository.create({
      message_id: message.id,
      guild_id: interaction.guildId ?? '',
      channel_id: interaction.channelId,
      creator_id: interaction.user.id,
      expires_at: Date.now() + hours * HOUR_MS,
    });
  } catch (error) {
    logger.warn(`Failed to record poll message: ${getErrorMessage(error)}`);
  }

  logger.info(
    `Poll created: "${question}" with ${collected.answers.length} answers by ${interaction.user.tag}`
  );
}

/**
 * Fetch the message the stored pointer refers to, or null when it is gone or
 * Discord has already closed the poll. Drops the stale row either way.
 */
async function fetchEndablePoll(
  interaction: ChatInputCommandInteraction,
  messageId: string
): Promise<Message | null> {
  const channel = interaction.channel;
  if (!channel?.isTextBased()) return null;

  const message = await channel.messages
    .fetch(messageId)
    .catch(() => null as Message | null);

  if (!message?.poll || message.poll.resultsFinalized) {
    pollRepository.remove(messageId);
    return null;
  }

  return message;
}

async function handleEndPoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  const record = pollRepository.findActiveByCreator(
    interaction.user.id,
    interaction.channelId
  );

  if (!record) {
    await replyError(
      interaction,
      locale,
      'poll.noActivePoll',
      'poll.noActivePollDesc'
    );
    return;
  }

  const message = await fetchEndablePoll(interaction, record.message_id);
  if (!message) {
    await replyError(
      interaction,
      locale,
      'poll.errors.pollEnded',
      'poll.errors.pollEndedDesc'
    );
    return;
  }

  const question = message.poll?.question.text ?? '';
  const confirmed = await awaitConfirmation(
    interaction,
    question ? `**${question}**` : t('poll.ended', locale),
    { ephemeral: true }
  );

  if (!confirmed) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('common.cancelled', locale),
          color: COLORS.INFO,
        }),
      ],
      components: [],
    });
    return;
  }

  try {
    await message.poll?.end();
  } catch (error) {
    logger.warn(`Failed to end poll ${record.message_id}:`, error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          t('poll.errors.pollEnded', locale),
          t('poll.errors.pollEndedDesc', locale)
        ),
      ],
      components: [],
    });
    pollRepository.remove(record.message_id);
    return;
  }

  pollRepository.remove(record.message_id);

  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('poll.ended', locale),
        description: t('poll.endedMessage', locale),
        color: COLORS.SUCCESS,
      }),
    ],
    components: [],
  });
}

export async function executePollCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    await handleCreatePoll(interaction);
    return;
  }

  if (subcommand === 'end') {
    await handleEndPoll(interaction);
  }
}
