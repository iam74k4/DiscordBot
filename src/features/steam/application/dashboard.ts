import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { createEmbed, createWarningEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';
import { Locale, t } from '../../../locales/index.js';
import {
  type FormattedGameInfo,
  type FormattedPlayerInfo,
  type RecentlyPlayedGame,
  PersonaState,
  formatPlaytime,
  formatPlaytimeWithBar,
  getStoreUrl,
  getStatusColor,
  getVisibilityIcon,
  steamClient,
} from '../services/steam/index.js';

type DashboardView = 'profile' | 'playtime' | 'recent' | 'games';
type GamesSort = 'playtime' | 'recent' | 'alphabetical';

const DASHBOARD_TIMEOUT = 120_000;
const GAMES_PREVIEW_LIMIT = 10;
const PLAYTIME_PREVIEW_LIMIT = 5;

interface DashboardCache {
  playtime?: {
    totalMinutes: number;
    games: FormattedGameInfo[];
  };
  recent?: RecentlyPlayedGame[];
  games: Partial<Record<GamesSort, FormattedGameInfo[]>>;
}

function buildNavigationRow(
  locale: Locale,
  activeView: DashboardView,
  profileUrl: string,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('steam-dashboard:profile')
      .setLabel(t('steam.ui.profileTab', locale))
      .setStyle(
        activeView === 'profile' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('steam-dashboard:playtime')
      .setLabel(t('steam.ui.playtimeTab', locale))
      .setStyle(
        activeView === 'playtime' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('steam-dashboard:recent')
      .setLabel(t('steam.ui.recentTab', locale))
      .setStyle(
        activeView === 'recent' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('steam-dashboard:games')
      .setLabel(t('steam.ui.gamesTab', locale))
      .setStyle(
        activeView === 'games' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setLabel(t('steam.profile.viewOnSteam', locale))
      .setStyle(ButtonStyle.Link)
      .setURL(profileUrl)
      .setDisabled(disabled)
  );
}

function buildGamesSortRow(
  locale: Locale,
  selectedSort: GamesSort,
  disabled: boolean = false
): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('steam-dashboard:games-sort')
      .setPlaceholder(t('steam.ui.sortPlaceholder', locale))
      .setDisabled(disabled)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(t('steam.ui.sortPlaytime', locale))
          .setValue('playtime')
          .setDefault(selectedSort === 'playtime'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('steam.ui.sortRecent', locale))
          .setValue('recent')
          .setDefault(selectedSort === 'recent'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('steam.ui.sortAlphabetical', locale))
          .setValue('alphabetical')
          .setDefault(selectedSort === 'alphabetical')
      )
  );
}

function buildProfileEmbed(
  playerInfo: FormattedPlayerInfo,
  locale: Locale
): EmbedBuilder {
  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const statusDisplay = playerInfo.currentGame
    ? `**${t('steam.profile.playing', locale)}:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const visibilityText = playerInfo.isPublic
    ? t('steam.profile.publicProfile', locale)
    : t('steam.profile.privateProfile', locale);
  const visibilityInfo = `${getVisibilityIcon(playerInfo.isPublic)} ${visibilityText}`;

  let description = `${visibilityInfo}\n\n${statusDisplay}`;
  if (!playerInfo.isPublic) {
    description += `\n\n*${t('steam.profile.privacyNote', locale)}*`;
  }

  const fields = [];
  const profileInfo = [];

  if (playerInfo.realName) {
    profileInfo.push(
      `**${t('steam.profile.realName', locale)}:** ${playerInfo.realName}`
    );
  }
  if (playerInfo.country) {
    profileInfo.push(
      `**${t('steam.profile.country', locale)}:** ${playerInfo.country}`
    );
  }
  if (playerInfo.createdAt) {
    const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
    const memberSince = playerInfo.createdAt.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    profileInfo.push(
      `**${t('steam.profile.memberSince', locale)}:** ${memberSince}`
    );
  }

  if (profileInfo.length > 0) {
    fields.push({
      name: t('steam.profile.profileInfo', locale),
      value: profileInfo.join('\n'),
      inline: false,
    });
  }

  fields.push({
    name: t('steam.profile.steamId', locale),
    value: `\`${playerInfo.steamId}\``,
    inline: true,
  });
  fields.push({
    name: t('steam.profile.profileLink', locale),
    value: `[${t('steam.profile.viewOnSteam', locale)}](${playerInfo.profileUrl})`,
    inline: true,
  });

  return createEmbed({
    title: playerInfo.name,
    description,
    color: embedColor,
    fields,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });
}

function buildPrivateProfileEmbed(
  playerInfo: FormattedPlayerInfo,
  locale: Locale
): EmbedBuilder {
  return createWarningEmbed(
    t('steam.profile.privateProfile', locale),
    t('steam.errors.privateProfile', locale, { name: playerInfo.name }),
    { timestamp: true }
  );
}

function buildPlaytimeEmbed(
  playerInfo: FormattedPlayerInfo,
  locale: Locale,
  totalMinutes: number,
  games: FormattedGameInfo[]
): EmbedBuilder {
  const maxPlaytime = games[0]?.playtimeForever ?? 0;
  const topGamesList =
    games.length === 0
      ? t('common.noData', locale)
      : games
          .map((game, index) => {
            const medal = `${index + 1}.`;
            const bar = formatPlaytimeWithBar(
              game.playtimeForever,
              maxPlaytime,
              locale
            );
            return `${medal} **${game.name}**\n${bar}`;
          })
          .join('\n\n');

  const totalHours = Math.floor(totalMinutes / 60);

  return createEmbed({
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
}

function buildRecentEmbed(
  playerInfo: FormattedPlayerInfo,
  locale: Locale,
  recentGames: RecentlyPlayedGame[]
): EmbedBuilder {
  if (recentGames.length === 0) {
    return createEmbed({
      title: `${playerInfo.name} - ${t('steam.recent.title', locale)}`,
      description: `**${t('steam.recent.noRecent', locale)}**`,
      color: COLORS.STEAM_OFFLINE,
      thumbnail: playerInfo.avatarUrl,
      timestamp: true,
    });
  }

  const totalRecentMinutes = recentGames.reduce(
    (total, game) => total + game.playtime_2weeks,
    0
  );
  const maxRecent = Math.max(...recentGames.map((g) => g.playtime_2weeks));

  const gamesList = recentGames
    .map((game, index) => {
      const bar = formatPlaytimeWithBar(
        game.playtime_2weeks,
        maxRecent,
        locale
      );
      const totalTime = formatPlaytime(game.playtime_forever, locale);
      return `${index + 1}. **[${game.name}](${getStoreUrl(game.appid)})**\n    ${bar}\n    ${t('steam.playtime.total', locale)}: ${totalTime}`;
    })
    .join('\n\n');

  const dailyAverage = Math.round(totalRecentMinutes / 14);

  return createEmbed({
    title: `${playerInfo.name} - ${t('steam.recent.title', locale)}`,
    description: `**${t('steam.playtime.last2Weeks', locale)}:** ${formatPlaytime(totalRecentMinutes, locale)}\n**${t('steam.recent.dailyAverage', locale)}:** ~${formatPlaytime(dailyAverage, locale)}\n\n${gamesList}`,
    color: COLORS.STEAM,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });
}

function getSortLabel(sort: GamesSort, locale: Locale): string {
  switch (sort) {
    case 'recent':
      return t('steam.ui.sortRecent', locale);
    case 'alphabetical':
      return t('steam.ui.sortAlphabetical', locale);
    default:
      return t('steam.ui.sortPlaytime', locale);
  }
}

function buildGamesEmbed(
  playerInfo: FormattedPlayerInfo,
  locale: Locale,
  games: FormattedGameInfo[],
  sort: GamesSort
): EmbedBuilder {
  if (games.length === 0) {
    return createWarningEmbed(
      t('common.notFound', locale),
      t('steam.games.noGames', locale, { name: playerInfo.name }),
      { timestamp: true }
    );
  }

  const maxPlaytime = Math.max(...games.map((g) => g.playtimeForever));
  const gamesList = games
    .map((game, index) => {
      const playtime = formatPlaytime(game.playtimeForever, locale);
      const recent =
        game.playtime2Weeks && game.playtime2Weeks > 0
          ? ` | ${t('steam.playtime.last2Weeks', locale)}: ${formatPlaytime(game.playtime2Weeks, locale)}`
          : '';
      const bar = formatPlaytimeWithBar(
        game.playtimeForever,
        maxPlaytime,
        locale
      );

      return `${index + 1}. **[${game.name}](${game.storeUrl})**\n    ${bar}\n    ${t('steam.playtime.total', locale)}: ${playtime}${recent}`;
    })
    .join('\n\n');

  return createEmbed({
    title: `${playerInfo.name} - ${t('steam.games.title', locale)}`,
    description: `**${t('steam.games.totalGames', locale)}:** ${games.length}+\n**${t(
      'steam.ui.sortedBy',
      locale,
      {
        sort: getSortLabel(sort, locale),
      }
    )}**\n**${t('steam.ui.showingTop', locale, {
      count: GAMES_PREVIEW_LIMIT,
    })}**\n\n${gamesList}`,
    color: COLORS.STEAM,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });
}

async function renderDashboardView(
  playerInfo: FormattedPlayerInfo,
  locale: Locale,
  steamId: string,
  view: DashboardView,
  gamesSort: GamesSort,
  cache: DashboardCache
): Promise<{
  embed: EmbedBuilder;
  components: [
    ActionRowBuilder<ButtonBuilder>,
    ...ActionRowBuilder<StringSelectMenuBuilder>[],
  ];
}> {
  const navigationRow = buildNavigationRow(
    locale,
    view,
    playerInfo.profileUrl,
    false
  );

  if (view === 'profile') {
    return {
      embed: buildProfileEmbed(playerInfo, locale),
      components: [navigationRow],
    };
  }

  if (!playerInfo.isPublic) {
    return {
      embed: buildPrivateProfileEmbed(playerInfo, locale),
      components: [navigationRow],
    };
  }

  if (view === 'playtime') {
    if (!cache.playtime) {
      const [totalMinutes, games] = await Promise.all([
        steamClient.getTotalPlaytime(steamId),
        steamClient.getFormattedGames(
          steamId,
          'playtime',
          PLAYTIME_PREVIEW_LIMIT
        ),
      ]);

      cache.playtime = { totalMinutes, games };
    }

    return {
      embed: buildPlaytimeEmbed(
        playerInfo,
        locale,
        cache.playtime.totalMinutes,
        cache.playtime.games
      ),
      components: [navigationRow],
    };
  }

  if (view === 'recent') {
    if (!cache.recent) {
      cache.recent = await steamClient.getRecentlyPlayedGames(steamId, 10);
    }

    return {
      embed: buildRecentEmbed(playerInfo, locale, cache.recent),
      components: [navigationRow],
    };
  }

  if (!cache.games[gamesSort]) {
    cache.games[gamesSort] = await steamClient.getFormattedGames(
      steamId,
      gamesSort,
      GAMES_PREVIEW_LIMIT
    );
  }

  return {
    embed: buildGamesEmbed(
      playerInfo,
      locale,
      cache.games[gamesSort] ?? [],
      gamesSort
    ),
    components: [navigationRow, buildGamesSortRow(locale, gamesSort)],
  };
}

function buildDisabledComponents(
  locale: Locale,
  playerInfo: FormattedPlayerInfo,
  view: DashboardView,
  gamesSort: GamesSort
): [
  ActionRowBuilder<ButtonBuilder>,
  ...ActionRowBuilder<StringSelectMenuBuilder>[],
] {
  const navigationRow = buildNavigationRow(
    locale,
    view,
    playerInfo.profileUrl,
    true
  );

  if (view !== 'games') {
    return [navigationRow];
  }

  return [navigationRow, buildGamesSortRow(locale, gamesSort, true)];
}

export async function showSteamProfileDashboard(
  interaction: ChatInputCommandInteraction,
  locale: Locale,
  steamId: string,
  playerInfo: FormattedPlayerInfo
): Promise<void> {
  let currentView: DashboardView = 'profile';
  let currentGamesSort: GamesSort = 'playtime';
  const cache: DashboardCache = { games: {} };

  const initialState = await renderDashboardView(
    playerInfo,
    locale,
    steamId,
    currentView,
    currentGamesSort,
    cache
  );

  const response = await interaction.editReply({
    embeds: [initialState.embed],
    components: initialState.components,
  });

  const collector = response.createMessageComponentCollector({
    time: DASHBOARD_TIMEOUT,
  });

  collector.on('collect', async (componentInteraction) => {
    if (componentInteraction.user.id !== interaction.user.id) {
      await componentInteraction.reply({
        content: t('steam.errors.onlyCommandUser', locale),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      if (componentInteraction.componentType === ComponentType.Button) {
        currentView = componentInteraction.customId.replace(
          'steam-dashboard:',
          ''
        ) as DashboardView;
      }

      if (componentInteraction.componentType === ComponentType.StringSelect) {
        currentView = 'games';
        currentGamesSort = componentInteraction.values[0] as GamesSort;
      }

      const nextState = await renderDashboardView(
        playerInfo,
        locale,
        steamId,
        currentView,
        currentGamesSort,
        cache
      );

      await componentInteraction.update({
        embeds: [nextState.embed],
        components: nextState.components,
      });
    } catch (error) {
      logger.warn(
        `Failed to update Steam dashboard: ${getErrorMessage(error)}`
      );
      await componentInteraction.deferUpdate().catch(() => undefined);
    }
  });

  collector.on('end', async () => {
    await interaction
      .editReply({
        components: buildDisabledComponents(
          locale,
          playerInfo,
          currentView,
          currentGamesSort
        ),
      })
      .catch((error: unknown) => {
        logger.debug(
          `Failed to disable Steam dashboard components: ${getErrorMessage(error)}`
        );
      });
  });
}
