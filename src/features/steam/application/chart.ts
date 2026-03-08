import { ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { steamClient } from '../services/steam/index.js';
import { steamUserRepository } from '../repositories/index.js';
import { createHorizontalBarChart } from '../../../utils/chart.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

export async function handleChart(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const steamId = steamUserRepository.getSteamId(targetUser.id);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      targetUser.id === interaction.user.id
        ? t('steam.errors.notLinked', locale)
        : t('steam.errors.userNotLinked', locale, {
            name: targetUser.displayName,
          })
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.errors.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!playerInfo.isPublic) {
    const warningEmbed = createWarningEmbed(
      t('steam.profile.privateProfile', locale),
      t('steam.errors.privateProfile', locale, { name: playerInfo.name })
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const [games, totalPlaytime] = await Promise.all([
    steamClient.getFormattedGames(steamId, 'playtime', 10),
    steamClient.getTotalPlaytime(steamId),
  ]);

  if (games.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.games.noGames', locale, { name: playerInfo.name })
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const labels = games.map((g) => g.name);
  const data = games.map((g) => Math.floor(g.playtimeForever / 60));

  const chartBuffer = await createHorizontalBarChart(
    labels,
    data,
    t('steam.chart.playtimeAxis', locale)
  );

  const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

  const totalHours = Math.floor(totalPlaytime / 60);
  // Sum raw minutes first, then convert to hours to avoid cumulative rounding loss
  const topGamesMinutes = games.reduce((sum, g) => sum + g.playtimeForever, 0);
  const topGamesHours = Math.floor(topGamesMinutes / 60);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${t('steam.chart.title', locale)}`,
    description: `**${t('steam.chart.topNGames', locale, { count: games.length })}:** ${topGamesHours.toLocaleString()} ${t('units.hours', locale)}\n**${t('steam.chart.totalPlaytime', locale)}:** ${totalHours.toLocaleString()} ${t('units.hours', locale)}`,
    color: COLORS.STEAM,
    image: 'attachment://chart.png',
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed], files: [attachment] });
}
