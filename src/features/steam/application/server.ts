import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { createPieChart } from '../../../utils/chart.js';
import { steamClient } from '../index.js';
import { steamUserRepository } from '../repositories/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

export async function executeServerCommand(
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
  if (guild.members.cache.size < guild.memberCount) {
    await guild.members.fetch({ limit: 1000 });
  }

  const totalMembers = guild.memberCount;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const humans = totalMembers - bots;

  const onlineStatuses = ['online', 'idle', 'dnd'];
  const online = guild.members.cache.filter(
    (m) =>
      !m.user.bot && onlineStatuses.includes(m.presence?.status ?? 'offline')
  ).size;
  const offline = humans - online;

  const humanIds = guild.members.cache
    .filter((m) => !m.user.bot)
    .map((m) => m.id);
  const steamUsers = steamUserRepository.getByDiscordIds(humanIds);
  const steamRegistered = steamUsers.length;

  const playtimeResults = steamClient.isConfigured()
    ? await Promise.allSettled(
        steamUsers.map(async (user) => {
          const playtime = await steamClient.getTotalPlaytime(user.steam_id);
          return {
            name: user.steam_name || 'Unknown',
            playtimeMinutes: playtime,
          };
        })
      )
    : [];

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

  const totalPlaytimeHours = Math.floor(
    topPlayers.reduce((sum, p) => sum + p.playtimeMinutes, 0) / 60
  );

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
