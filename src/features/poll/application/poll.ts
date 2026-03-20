import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  PollData,
  MAX_ACTIVE_POLLS,
  buildPollButtons,
  buildPollResultEmbed,
  endPoll,
  findUserPollInChannel,
  pollStore,
} from '../services/index.js';
import { awaitConfirmation } from '../../../utils/confirm.js';

async function handleCreatePoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const question = interaction.options.getString('question', true);
  const duration = interaction.options.getInteger('duration');
  const anonymous = interaction.options.getBoolean('anonymous') ?? false;

  const options: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const option = interaction.options.getString(`option${i}`);
    if (option) {
      options.push(option);
    }
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

  const embed = buildPollResultEmbed(pollData);
  const buttons = buildPollButtons(pollData);

  const message = await interaction.reply({
    embeds: [embed],
    components: buttons,
    fetchReply: true,
  });

  pollStore.set(message.id, pollData);

  logger.info(
    `Poll created: "${question}" with ${options.length} options by ${interaction.user.tag}`
  );

  if (duration) {
    pollData.timeout = setTimeout(
      async () => {
        try {
          await endPoll(message.id);
        } catch (error) {
          logger.error(
            `Failed to auto-end poll ${message.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      },
      duration * 60 * 1000
    );
  }
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
  } else if (subcommand === 'end') {
    await handleEndPoll(interaction);
  }
}
