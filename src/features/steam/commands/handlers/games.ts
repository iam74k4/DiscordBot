import {
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../../utils/embed.js';
import { COLORS } from '../../../../utils/constants/index.js';
import {
  steamClient,
  formatPlaytimeWithBar,
} from '../../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../../locales/index.js';
import { logger } from '../../../../utils/logger.js';
import { GAMES_PER_PAGE, resolveSteamId, buildButtons } from '../../lib/shared.js';

export async function handleGames(
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

  const games = await steamClient.getFormattedGames(
    steamId,
    'alphabetical',
    100
  );

  if (games.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.games.noGames', locale, { name: playerInfo.name })
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  const maxPlaytime = Math.max(...games.map((g) => g.playtimeForever));
  let currentPage = 0;

  const buildGamesEmbed = (page: number) => {
    const startIndex = page * GAMES_PER_PAGE;
    const pageGames = games.slice(startIndex, startIndex + GAMES_PER_PAGE);

    const gamesList = pageGames
      .map((game, index) => {
        const rank = startIndex + index + 1;
        const medal =
          rank <= 3 ? `${rank}.` : `\`${rank.toString().padStart(2, ' ')}\``;
        const bar = formatPlaytimeWithBar(game.playtimeForever, maxPlaytime);
        return `${medal} **${game.name}**\n    ${bar}`;
      })
      .join('\n\n');

    return createEmbed({
      title: `${playerInfo.name} - ${t('steam.games.title', locale)}`,
      description: `**${t('steam.games.totalGames', locale)}:** ${games.length}\n\n${gamesList}`,
      color: COLORS.STEAM,
      thumbnail: playerInfo.avatarUrl,
      footer: `${page + 1} / ${totalPages}`,
      timestamp: true,
    });
  };

  const embed = buildGamesEmbed(currentPage);
  const buttons = buildButtons(currentPage, totalPages);

  const response = await interaction.editReply({
    embeds: [embed],
    components: totalPages > 1 ? [buttons] : [],
  });

  if (totalPages <= 1) return;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({
        content: t('steam.errors.onlyCommandUser', locale),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (buttonInteraction.customId) {
      case 'first':
        currentPage = 0;
        break;
      case 'prev':
        currentPage = Math.max(0, currentPage - 1);
        break;
      case 'next':
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        break;
      case 'last':
        currentPage = totalPages - 1;
        break;
    }

    await buttonInteraction.update({
      embeds: [buildGamesEmbed(currentPage)],
      components: [buildButtons(currentPage, totalPages)],
    });
  });

  collector.on('end', async () => {
    await interaction
      .editReply({ components: [buildButtons(currentPage, totalPages, true)] })
      .catch((e) => {
        logger.debug(
          `Failed to disable games pagination buttons: ${e.message}`
        );
      });
  });
}
