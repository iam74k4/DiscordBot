import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  PollData,
  buildPollButtons,
  buildPollResultEmbed,
  endPoll,
  findUserPollInChannel,
  pollStore,
} from '../services/index.js';

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

  const pollData: PollData = {
    question,
    options,
    votes: new Map(),
    creatorId: interaction.user.id,
    anonymous,
    channelId: interaction.channelId,
    guildId: interaction.guildId ?? '',
    client: interaction.client,
    locale,
  };

  const embed = buildPollResultEmbed(pollData);
  const buttons = buildPollButtons(pollData);

  if (duration) {
    const footerParts: string[] = [];
    if (anonymous) {
      footerParts.push(t('poll.anonymous', locale));
    }
    footerParts.push(t('poll.endsIn', locale, { duration }));
    footerParts.push(t('poll.total', locale, { count: 0 }));
    embed.setFooter({ text: footerParts.join(' | ') });
  }

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
        await endPoll(message.id);
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

  await endPoll(foundMessageId, interaction.client);

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('poll.ended', locale),
        description: t('poll.endedMessage', locale),
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
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
