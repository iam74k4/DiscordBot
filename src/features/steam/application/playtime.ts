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
} from '../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveSteamId } from '../lib/shared.js';

export async function handlePlaytime(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction, locale);
  const gameName = interaction.options.getString('game');

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

  if (gameName) {
    const game = await steamClient.findGameByName(steamId, gameName);

    if (!game) {
      const errorEmbed = createErrorEmbed(
        t('common.notFound', locale),
        t('steam.errors.gameNotFound', locale, { game: gameName })
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const fields = [
      {
        name: t('steam.playtime.total', locale),
        value: `**${formatPlaytime(game.playtimeForever, locale)}**`,
        inline: true,
      },
    ];

    if (game.playtime2Weeks) {
      fields.push({
        name: t('steam.playtime.last2Weeks', locale),
        value: `**${formatPlaytime(game.playtime2Weeks, locale)}**`,
        inline: true,
      });
    }

    const embed = createEmbed({
      title: game.name,
      description: `**${playerInfo.name}**\n\n[${t('steam.profile.viewOnSteam', locale)}](${game.storeUrl})`,
      color: COLORS.STEAM,
      fields,
      thumbnail: game.iconUrl || undefined,
      timestamp: true,
    });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const totalMinutes = await steamClient.getTotalPlaytime(steamId);
  const games = await steamClient.getFormattedGames(steamId, 'playtime', 5);

  if (games.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.games.noGames', locale, { name: playerInfo.name })
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const maxPlaytime = games[0].playtimeForever;
  const topGamesList = games
    .map((game, index) => {
      const medal =
        index === 0
          ? '1.'
          : index === 1
            ? '2.'
            : index === 2
              ? '3.'
              : `${index + 1}.`;
      const bar = formatPlaytimeWithBar(
        game.playtimeForever,
        maxPlaytime,
        locale
      );
      return `${medal} **${game.name}**\n${bar}`;
    })
    .join('\n\n');

  const totalHours = Math.floor(totalMinutes / 60);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${t('steam.playtime.title', locale)}`,
    description: `**${t('steam.playtime.total', locale)}:** ${formatPlaytime(totalMinutes, locale)}\n**${t('steam.games.totalGames', locale)}:** ${games.length}+`,
    color: COLORS.STEAM,
    fields: [
      {
        name: t('steam.games.top5', locale),
        value: topGamesList,
        inline: false,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    footer: `${totalHours.toLocaleString()}h`,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}
