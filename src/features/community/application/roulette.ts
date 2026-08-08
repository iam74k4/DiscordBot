import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  StageChannel,
  VoiceChannel,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';

const ANIMATION_DELAY = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getVoiceMembers(channel: VoiceChannel | StageChannel): GuildMember[] {
  return Array.from(channel.members.values()).filter(
    (member) => !member.user.bot
  );
}

function formatMember(member: GuildMember): string {
  return member.displayName;
}

function mentionMember(member: GuildMember): string {
  return `<@${member.id}>`;
}

async function handleMemberRoulette(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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

  await interaction.deferReply();

  for (let i = 3; i >= 1; i--) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('roulette.member.title', locale),
          description: `**${t('roulette.member.countdown', locale, { count: i })}**`,
          color: COLORS.WARNING,
          timestamp: false,
        }),
      ],
    });
    await sleep(ANIMATION_DELAY);
  }

  const candidateList = members.map((m) => formatMember(m)).join(', ');
  await interaction.editReply({
    embeds: [
      createEmbed({
        title: t('roulette.member.title', locale),
        description: t('roulette.member.selecting', locale, {
          candidates: candidateList,
        }),
        color: COLORS.WARNING,
        timestamp: false,
      }),
    ],
  });
  await sleep(ANIMATION_DELAY * 1.5);

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

async function handleTeamRoulette(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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

  await interaction.deferReply();

  for (let i = 3; i >= 1; i--) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('roulette.team.title', locale),
          description: `**${t('roulette.member.countdown', locale, { count: i })}**`,
          color: COLORS.WARNING,
          timestamp: false,
        }),
      ],
    });
    await sleep(ANIMATION_DELAY);
  }

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
        timestamp: false,
      }),
    ],
  });
  await sleep(ANIMATION_DELAY * 1.5);

  const shuffled = shuffle(members);
  const teams: GuildMember[][] = Array.from({ length: teamCount }, () => []);
  shuffled.forEach((m, index) => {
    teams[index % teamCount].push(m);
  });

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

export async function executeRouletteCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'member') {
    await handleMemberRoulette(interaction);
  } else if (subcommand === 'team') {
    await handleTeamRoulette(interaction);
  }
}
