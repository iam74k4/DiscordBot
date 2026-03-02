import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  pollStore,
  PollData,
  buildPollResultEmbed,
  buildPollButtons,
  endPoll,
  findUserPollInChannel,
} from '../services/index.js';

/**
 * Poll command - create and manage polls
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .setDescriptionLocalizations({
      ja: '投票の作成と管理',
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new poll')
        .setDescriptionLocalizations({
          ja: '新しい投票を作成',
        })
        .addStringOption((option) =>
          option
            .setName('question')
            .setDescription('The poll question')
            .setDescriptionLocalizations({
              ja: '投票の質問',
            })
            .setRequired(true)
            .setMaxLength(256)
        )
        .addStringOption((option) =>
          option
            .setName('option1')
            .setDescription('First option')
            .setDescriptionLocalizations({ ja: '選択肢1' })
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option2')
            .setDescription('Second option')
            .setDescriptionLocalizations({ ja: '選択肢2' })
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option3')
            .setDescription('Third option')
            .setDescriptionLocalizations({ ja: '選択肢3' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option4')
            .setDescription('Fourth option')
            .setDescriptionLocalizations({ ja: '選択肢4' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option5')
            .setDescription('Fifth option')
            .setDescriptionLocalizations({ ja: '選択肢5' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option6')
            .setDescription('Sixth option')
            .setDescriptionLocalizations({ ja: '選択肢6' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option7')
            .setDescription('Seventh option')
            .setDescriptionLocalizations({ ja: '選択肢7' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option8')
            .setDescription('Eighth option')
            .setDescriptionLocalizations({ ja: '選択肢8' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option9')
            .setDescription('Ninth option')
            .setDescriptionLocalizations({ ja: '選択肢9' })
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option10')
            .setDescription('Tenth option')
            .setDescriptionLocalizations({ ja: '選択肢10' })
            .setMaxLength(100)
        )
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Poll duration in minutes')
            .setDescriptionLocalizations({
              ja: '投票の期間（分）',
            })
            .addChoices(
              { name: '5 minutes', value: 5 },
              { name: '10 minutes', value: 10 },
              { name: '30 minutes', value: 30 },
              { name: '1 hour', value: 60 },
              { name: '3 hours', value: 180 },
              { name: '24 hours', value: 1440 }
            )
        )
        .addBooleanOption((option) =>
          option
            .setName('anonymous')
            .setDescription('Make the poll anonymous (default: false)')
            .setDescriptionLocalizations({
              ja: '匿名投票にする（デフォルト: false）',
            })
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('end')
        .setDescription('End your active poll')
        .setDescriptionLocalizations({
          ja: '有効な投票を終了',
        })
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 5000,
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      await handleCreatePoll(interaction);
    } else if (subcommand === 'end') {
      await handleEndPoll(interaction);
    }
  },
};

/**
 * Handle poll creation
 */
async function handleCreatePoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const question = interaction.options.getString('question', true);
  const duration = interaction.options.getInteger('duration');
  const anonymous = interaction.options.getBoolean('anonymous') ?? false;

  // Collect options
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

  // Create poll data
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

  // Build embed and buttons
  const embed = buildPollResultEmbed(pollData);
  const buttons = buildPollButtons(pollData);

  // Add duration info to embed if specified
  if (duration) {
    const footerParts: string[] = [];
    if (anonymous) {
      footerParts.push(t('poll.anonymous', locale));
    }
    footerParts.push(t('poll.endsIn', locale, { duration }));
    footerParts.push(t('poll.total', locale, { count: 0 }));
    embed.setFooter({ text: footerParts.join(' | ') });
  }

  // Send the poll message
  const message = await interaction.reply({
    embeds: [embed],
    components: buttons,
    fetchReply: true,
  });

  // Store poll data
  pollStore.set(message.id, pollData);

  logger.info(
    `Poll created: "${question}" with ${options.length} options by ${interaction.user.tag}`
  );

  // Set auto-end timeout if duration specified
  if (duration) {
    pollData.timeout = setTimeout(
      async () => {
        await endPoll(message.id);
      },
      duration * 60 * 1000
    );
  }
}

/**
 * Handle poll end command
 */
async function handleEndPoll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  // Find user's active poll in this channel
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

export default command;
