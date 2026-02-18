import { ChatInputCommandInteraction } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import {
  steamClient,
  formatPlaytime,
  formatPlaytimeWithBar,
  getStoreUrl,
} from '../../../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveSteamId } from '../shared.js';

export async function handleRecent(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction, locale);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      error ?? t('steam.errors.couldNotResolve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
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

  const recentGames = await steamClient.getRecentlyPlayedGames(steamId, 10);

  if (recentGames.length === 0) {
    const embed = createEmbed({
      title: `${playerInfo.name} - ${t('steam.recent.title', locale)}`,
      description: `**${t('steam.recent.noRecent', locale)}**`,
      color: COLORS.STEAM_OFFLINE,
      thumbnail: playerInfo.avatarUrl,
      timestamp: true,
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const totalRecentMinutes = recentGames.reduce(
    (total, game) => total + game.playtime_2weeks,
    0
  );
  const maxRecent = Math.max(...recentGames.map((g) => g.playtime_2weeks));

  const gamesList = recentGames
    .map((game, index) => {
      const medal = index < 3 ? `${index + 1}.` : `${index + 1}.`;
      const bar = formatPlaytimeWithBar(
        game.playtime_2weeks,
        maxRecent,
        locale
      );
      const totalTime = formatPlaytime(game.playtime_forever, locale);
      return `${medal} **[${game.name}](${getStoreUrl(game.appid)})**\n    ${bar}\n    ${t('steam.playtime.total', locale)}: ${totalTime}`;
    })
    .join('\n\n');

  const dailyAverage = Math.round(totalRecentMinutes / 14);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${t('steam.recent.title', locale)}`,
    description: `**${t('steam.playtime.last2Weeks', locale)}:** ${formatPlaytime(totalRecentMinutes, locale)}\n**${t('steam.recent.dailyAverage', locale)}:** ~${formatPlaytime(dailyAverage, locale)}\n\n${gamesList}`,
    color: COLORS.STEAM,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}
