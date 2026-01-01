import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';
import { createPieChart } from '../../utils/chart.js';
import { getSteamUsersByDiscordIds } from '../../services/database/index.js';
import { steamClient } from '../../services/steam/index.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

/**
 * Handle /server stats command
 */
async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.guildOnly', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild;
  await guild.members.fetch();

  // Member statistics
  const totalMembers = guild.memberCount;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const humans = totalMembers - bots;

  // Member status breakdown
  const onlineStatuses = ['online', 'idle', 'dnd'];
  const online = guild.members.cache.filter(
    (m) =>
      !m.user.bot && onlineStatuses.includes(m.presence?.status ?? 'offline')
  ).size;
  const offline = humans - online;

  // Steam statistics
  const humanIds = guild.members.cache
    .filter((m) => !m.user.bot)
    .map((m) => m.id);
  const steamUsers = getSteamUsersByDiscordIds(humanIds);
  const steamRegistered = steamUsers.length;

  // Fetch playtime for all registered users in parallel (in minutes)
  const playtimeResults = await Promise.allSettled(
    steamUsers.map(async (user) => {
      const playtime = await steamClient.getTotalPlaytime(user.steam_id);
      return {
        name: user.steam_name || 'Unknown',
        playtimeMinutes: playtime,
      };
    })
  );

  // Extract successful results and sort by playtime
  const topPlayers = playtimeResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<{
        name: string;
        playtimeMinutes: number;
      }> => result.status === 'fulfilled'
    )
    .map((result) => result.value)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

  // Calculate combined playtime from all successful fetches (sum minutes, then convert to hours)
  const totalPlaytimeHours = Math.floor(
    topPlayers.reduce((sum, p) => sum + p.playtimeMinutes, 0) / 60
  );

  // Create member status pie chart (chart labels stay in English for now)
  const memberChartBuffer = await createPieChart(
    [
      t('server.stats.online', locale),
      t('server.stats.offline', locale),
      t('server.stats.bots', locale),
    ],
    [online, offline, bots],
    t('server.stats.members', locale)
  );

  const memberAttachment = new AttachmentBuilder(memberChartBuffer, {
    name: 'members.png',
  });

  // Create description
  const description = [
    `**${t('server.stats.members', locale)}**`,
    `${t('server.stats.total', locale)}: ${totalMembers.toLocaleString()}`,
    `${t('server.stats.online', locale)}: ${online.toLocaleString()}`,
    `${t('server.stats.offline', locale)}: ${offline.toLocaleString()}`,
    `${t('server.stats.bots', locale)}: ${bots.toLocaleString()}`,
    '',
    `**${t('server.stats.steam.title', locale)}**`,
    `${t('server.stats.steam.registered', locale)}: ${steamRegistered.toLocaleString()} / ${humans.toLocaleString()}`,
    `${t('server.stats.steam.playtime', locale)}: ${totalPlaytimeHours.toLocaleString()}h`,
  ].join('\n');

  const fields = [];

  if (topPlayers.length > 0) {
    const topList = topPlayers
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** - ${Math.floor(p.playtimeMinutes / 60).toLocaleString()}h`
      )
      .join('\n');

    fields.push({
      name: t('server.stats.steam.topPlayers', locale),
      value: topList,
      inline: false,
    });
  }

  const embed = createEmbed({
    title: `${guild.name} - ${t('server.stats.title', locale)}`,
    description,
    color: COLORS.PRIMARY,
    fields,
    image: 'attachment://members.png',
    thumbnail: guild.iconURL() || undefined,
    timestamp: true,
  });

  await interaction.editReply({
    embeds: [embed],
    files: [memberAttachment],
  });
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server information commands')
    .setDescriptionLocalizations({
      ja: 'サーバー情報コマンド',
    })
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription('View server statistics')
        .setDescriptionLocalizations({
          ja: 'サーバー統計を表示',
        })
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds (heavier command)
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'stats':
        await handleStats(interaction);
        break;
    }
  },
};

export default command;
