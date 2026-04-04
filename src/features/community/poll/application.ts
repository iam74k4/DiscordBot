import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { awaitConfirmation } from '../../../shared/utils/confirm.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { mapDiscordLocale, t } from '../../../locales/index.js';
import {
  buildPollButtons,
  buildPollResultEmbed,
  endPoll,
  findUserPollInChannel,
} from './pollService.js';
import { pollStore, type PollData, MAX_ACTIVE_POLLS } from './pollStore.js';

async function handleCreatePoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const question = interaction.options.getString('question', true);
  const duration = interaction.options.getInteger('duration');
  const anonymous = interaction.options.getBoolean('anonymous') ?? false;

  if (question.length > 256) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('poll.errors.questionTooLong', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const options: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const option = interaction.options.getString(`option${i}`);
    if (!option) continue;

    if (option.length > 100) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('common.error', locale),
            t('poll.errors.optionTooLong', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    options.push(option);
  }

  if (options.length < 2) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('poll.errors.notEnoughOptions', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!pollStore.canCreate()) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('poll.errors.maxActivePolls', locale),
          t('poll.errors.maxActivePollsDesc', locale, {
            count: MAX_ACTIVE_POLLS,
          })
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pollData: PollData = {
    question,
    options,
    votes: new Map(),
    creatorId: interaction.user.id,
    anonymous,
    endsAt: duration ? Date.now() + duration * 60 * 1000 : undefined,
    channelId: interaction.channelId,
    guildId: interaction.guildId ?? '',
    client: interaction.client,
    locale,
  };

  const message = await interaction.reply({
    embeds: [buildPollResultEmbed(pollData)],
    components: buildPollButtons(pollData),
    fetchReply: true,
  });

  pollStore.set(message.id, pollData);
  logger.info(
    `Poll created: "${question}" with ${options.length} options by ${interaction.user.tag}`
  );

  if (!duration) {
    return;
  }

  pollData.timeout = setTimeout(
    async () => {
      try {
        await endPoll(message.id);
      } catch (error) {
        logger.error(
          `Failed to auto-end poll ${message.id}:`,
          getErrorMessage(error)
        );
      }
    },
    duration * 60 * 1000
  );
}

async function handleEndPoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const foundMessageId = findUserPollInChannel(
    interaction.user.id,
    interaction.channelId
  );

  if (!foundMessageId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('poll.noActivePoll', locale),
          t('poll.noActivePollDesc', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pollData = pollStore.get(foundMessageId);
  const pollQuestion = pollData?.question ?? '';
  const confirmed = await awaitConfirmation(
    interaction,
    pollQuestion ? `**${pollQuestion}**` : t('poll.ended', locale),
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

  await endPoll(foundMessageId, interaction.client);
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
