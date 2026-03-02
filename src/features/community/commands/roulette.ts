import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  StageChannel,
  MessageFlags,
  ChannelType,
} from 'discord.js';
import { Command } from '../../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

/**
 * Animation delay in milliseconds
 */
const ANIMATION_DELAY = 800;

/**
 * Sleep utility for animation
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get voice channel members (excluding bots)
 */
function getVoiceMembers(channel: VoiceChannel | StageChannel): GuildMember[] {
  return Array.from(channel.members.values()).filter(
    (member) => !member.user.bot
  );
}

/**
 * Format member display name
 */
function formatMember(member: GuildMember): string {
  return member.displayName;
}

/**
 * Format member mention
 */
function mentionMember(member: GuildMember): string {
  return `<@${member.id}>`;
}

/**
 * Roulette command - random member selection and team assignment
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Random selection from voice channel members')
    .setDescriptionLocalizations({
      ja: 'ボイスチャンネルのメンバーからランダム選択',
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName('member')
        .setDescription('Randomly select one member from voice channel')
        .setDescriptionLocalizations({
          ja: 'ボイスチャンネルからランダムに1人選択',
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Divide voice channel members into teams')
        .setDescriptionLocalizations({
          ja: 'ボイスチャンネルのメンバーをチーム分け',
        })
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of teams')
            .setDescriptionLocalizations({
              ja: '作成するチーム数',
            })
            .setRequired(true)
            .addChoices(
              { name: '2 teams', value: 2 },
              { name: '3 teams', value: 3 },
              { name: '4 teams', value: 4 },
              { name: '5 teams', value: 5 },
              { name: '6 teams', value: 6 }
            )
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds cooldown (animation takes time)
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'member') {
      await handleMemberRoulette(interaction);
    } else if (subcommand === 'team') {
      await handleTeamRoulette(interaction);
    }
  },
};

/**
 * Handle member roulette - select one random member
 */
async function handleMemberRoulette(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  // Check if command is used in a guild
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is in a voice channel
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (
    !voiceChannel ||
    (voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice)
  ) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('roulette.errors.notInVoice', locale),
          t('roulette.errors.notInVoiceDesc', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get members (excluding bots)
  const members = getVoiceMembers(voiceChannel);

  if (members.length === 0) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('roulette.errors.noMembers', locale),
          t('roulette.errors.noMembersDesc', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (members.length === 1) {
    await interaction.reply({
      embeds: [
        createEmbed({
          title: t('roulette.member.result', locale),
          description: t('roulette.member.onlyOne', locale, {
            member: mentionMember(members[0]),
          }),
          color: COLORS.SUCCESS,
        }),
      ],
    });
    return;
  }

  // Start animation
  await interaction.deferReply();

  // Phase 1: Countdown
  for (let i = 3; i >= 1; i--) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('roulette.member.title', locale),
          description: `**${t('roulette.member.countdown', locale, { count: i })}**`,
          color: COLORS.WARNING,
        }),
      ],
    });
    await sleep(ANIMATION_DELAY);
  }

  // Phase 2: Show all candidates
  const candidateList = members.map((m) => formatMember(m)).join(', ');
  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('roulette.member.title', locale),
        description: t('roulette.member.selecting', locale, {
          candidates: candidateList,
        }),
        color: COLORS.WARNING,
      }),
    ],
  });
  await sleep(ANIMATION_DELAY * 1.5);

  // Phase 3: Final result
  const winner = members[Math.floor(Math.random() * members.length)];
  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('roulette.member.result', locale),
        description: `${mentionMember(winner)}`,
        color: COLORS.SUCCESS,
        footer: t('roulette.member.footer', locale, {
          count: members.length,
          channel: voiceChannel.name,
        }),
        timestamp: true,
      }),
    ],
  });

  logger.info(
    `Roulette member: ${winner.displayName} selected from ${members.length} members by ${interaction.user.tag}`
  );
}

/**
 * Handle team roulette - divide members into teams
 */
async function handleTeamRoulette(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  // Check if command is used in a guild
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const teamCount = interaction.options.getInteger('count', true);

  // Check if user is in a voice channel
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (
    !voiceChannel ||
    (voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice)
  ) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('roulette.errors.notInVoice', locale),
          t('roulette.errors.notInVoiceDesc', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get members (excluding bots)
  const members = getVoiceMembers(voiceChannel);

  if (members.length < teamCount) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('roulette.errors.notEnough', locale),
          t('roulette.errors.notEnoughDesc', locale, {
            teams: teamCount,
            required: teamCount,
            current: members.length,
          })
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Start animation
  await interaction.deferReply();

  // Phase 1: Countdown
  for (let i = 3; i >= 1; i--) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('roulette.team.title', locale),
          description: `**${t('roulette.member.countdown', locale, { count: i })}**`,
          color: COLORS.WARNING,
        }),
      ],
    });
    await sleep(ANIMATION_DELAY);
  }

  // Phase 2: Show all candidates
  const candidateList = members.map((m) => formatMember(m)).join(', ');
  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('roulette.team.title', locale),
        description: t('roulette.team.shuffling', locale, {
          count: members.length,
          teams: teamCount,
          candidates: candidateList,
        }),
        color: COLORS.WARNING,
      }),
    ],
  });
  await sleep(ANIMATION_DELAY * 1.5);

  // Phase 3: Create teams
  const shuffled = shuffle(members);
  const teams: GuildMember[][] = Array.from({ length: teamCount }, () => []);

  // Distribute members evenly
  shuffled.forEach((m, index) => {
    teams[index % teamCount].push(m);
  });

  // Build team fields
  const fields = teams.map((team, index) => ({
    name: t('roulette.team.teamName', locale, {
      number: index + 1,
      count: team.length,
    }),
    value:
      team.map((m) => mentionMember(m)).join('\n') ||
      t('roulette.team.noMembers', locale),
    inline: true,
  }));

  // Final result
  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('roulette.team.result', locale),
        description: t('roulette.team.resultDesc', locale, {
          count: members.length,
          teams: teamCount,
        }),
        color: COLORS.SUCCESS,
        fields,
        footer: t('roulette.team.footer', locale, {
          channel: voiceChannel.name,
        }),
        timestamp: true,
      }),
    ],
  });

  logger.info(
    `Roulette team: ${members.length} members divided into ${teamCount} teams by ${interaction.user.tag}`
  );
}

export default command;
