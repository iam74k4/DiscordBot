import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ButtonInteraction,
  MessageFlags,
  Client,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS, PROGRESS_BAR } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Poll data structure
 */
interface PollData {
  /** Poll question */
  question: string;
  /** Poll options */
  options: string[];
  /** Votes per option (userId -> optionIndex) */
  votes: Map<string, number>;
  /** Poll creator ID */
  creatorId: string;
  /** Whether the poll is anonymous */
  anonymous: boolean;
  /** Auto-end timeout */
  timeout?: NodeJS.Timeout;
  /** Channel ID */
  channelId: string;
  /** Guild ID */
  guildId: string;
  /** Discord client reference for auto-end */
  client?: Client;
}

/**
 * In-memory poll storage (messageId -> PollData)
 */
export const pollStore = new Map<string, PollData>();

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
function buildPollResultEmbed(
  poll: PollData,
  ended: boolean = false
): ReturnType<typeof createEmbed> {
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
      value: `${bar} ${count} votes (${percentage.toFixed(1)}%)`,
      inline: false,
    };
  });

  return createEmbed({
    title: ended ? 'Poll Ended' : 'Poll',
    description: poll.question,
    color: ended ? COLORS.WARNING : COLORS.PRIMARY,
    fields,
    footer: poll.anonymous
      ? `Anonymous poll | Total: ${totalVotes} votes`
      : `Total: ${totalVotes} votes`,
    timestamp: true,
  });
}

/**
 * Build vote buttons for poll
 */
function buildPollButtons(
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
 * Note: Caller should verify poll exists in pollStore before calling
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

  // Extract option index from customId (poll_vote_0, poll_vote_1, etc.)
  const optionIndex = parseInt(interaction.customId.split('_')[2], 10);

  if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
    await interaction.reply({
      content: 'Invalid vote option.',
      flags: MessageFlags.Ephemeral,
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
    responseMessage = `Vote changed from "${poll.options[previousVote]}" to "${poll.options[optionIndex]}"`;
  } else if (previousVote === optionIndex) {
    responseMessage = `You already voted for "${poll.options[optionIndex]}"`;
  } else {
    responseMessage = `Voted for "${poll.options[optionIndex]}"`;
  }

  // Acknowledge the vote
  await interaction.reply({
    content: responseMessage,
    flags: MessageFlags.Ephemeral,
  });

  // Update the poll message with new results
  const embed = buildPollResultEmbed(poll);
  await interaction.message.edit({ embeds: [embed] }).catch(() => {});
}

/**
 * End a poll and show final results
 */
async function endPoll(
  messageId: string,
  client?: Client
): Promise<void> {
  const poll = pollStore.get(messageId);
  if (!poll) return;

  // Clear timeout if exists
  if (poll.timeout) {
    clearTimeout(poll.timeout);
  }

  // Remove from store
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
 * Poll command - create and manage polls
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new poll')
        .addStringOption((option) =>
          option
            .setName('question')
            .setDescription('The poll question')
            .setRequired(true)
            .setMaxLength(256)
        )
        .addStringOption((option) =>
          option
            .setName('option1')
            .setDescription('First option')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option2')
            .setDescription('Second option')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option3')
            .setDescription('Third option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option4')
            .setDescription('Fourth option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option5')
            .setDescription('Fifth option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option6')
            .setDescription('Sixth option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option7')
            .setDescription('Seventh option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option8')
            .setDescription('Eighth option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option9')
            .setDescription('Ninth option')
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('option10')
            .setDescription('Tenth option')
            .setMaxLength(100)
        )
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Poll duration in minutes (leave empty for unlimited)')
            .setMinValue(1)
            .setMaxValue(1440)
        )
        .addBooleanOption((option) =>
          option
            .setName('anonymous')
            .setDescription('Make the poll anonymous (default: false)')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('end').setDescription('End your active poll')
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
      embeds: [createErrorEmbed('Error', 'At least 2 options are required.')],
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
  };

  // Build embed and buttons
  const embed = buildPollResultEmbed(pollData);
  const buttons = buildPollButtons(pollData);

  // Add duration info to embed if specified
  if (duration) {
    embed.setFooter({
      text: `${anonymous ? 'Anonymous poll | ' : ''}Ends in ${duration} minute${duration > 1 ? 's' : ''} | Total: 0 votes`,
    });
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
  // Find user's active poll in this channel
  let foundMessageId: string | null = null;

  for (const [messageId, poll] of pollStore.entries()) {
    if (
      poll.creatorId === interaction.user.id &&
      poll.channelId === interaction.channelId
    ) {
      foundMessageId = messageId;
      break;
    }
  }

  if (!foundMessageId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'No Active Poll',
          'You do not have an active poll in this channel.'
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
        title: 'Poll Ended',
        description: 'Your poll has been ended and results are now final.',
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export default command;

