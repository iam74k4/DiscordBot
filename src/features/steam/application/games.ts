import { ChatInputCommandInteraction } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { steamClient, formatPlaytimeWithBar } from '../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { GAMES_PER_PAGE, resolveSteamId } from '../lib/shared.js';
import { sendPaginatedMessage } from '../../../utils/pagination.js';

interface FormattedGame {
  name: string;
  playtimeForever: number;
}

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

  const maxPlaytime = Math.max(...games.map((g) => g.playtimeForever));

  await sendPaginatedMessage<FormattedGame>({
    items: games,
    itemsPerPage: GAMES_PER_PAGE,
    interaction,
    onlyOwnerMessage: t('steam.errors.onlyCommandUser', locale),
    formatPage: (pageGames, page, totalPages) => {
      const startIndex = page * GAMES_PER_PAGE;

      const gamesList = pageGames
        .map((game, index) => {
          const rank = startIndex + index + 1;
          const medal =
            rank <= 3
              ? `${rank}.`
              : `\`${rank.toString().padStart(2, ' ')}\``;
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
      });
    },
  });
}
