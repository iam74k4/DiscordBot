import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ComponentType,
  Guild,
  MessageFlags,
  AttachmentBuilder,
} from 'discord.js';
import { Command } from '../../types/index.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../utils/embed.js';
import { COLORS } from '../../utils/constants/index.js';
import {
  steamClient,
  formatPlaytime,
  formatPlaytimeWithBar,
  getStatusColor,
  getVisibilityIcon,
  PersonaState,
  getStoreUrl,
} from '../../services/steam/index.js';
import {
  getSteamId,
  getSteamUser,
  registerSteamUser,
  unregisterSteamUser,
  getSteamUsersByDiscordIds,
  getPlaytimeChange,
  getPlaytimeHistory,
  getClosestRecordBefore,
  getAllSteamUsers,
} from '../../services/database/index.js';
import { smartFilter } from '../../utils/fuzzy.js';
import {
  createHorizontalBarChart,
  createLineChart,
} from '../../utils/chart.js';
import { t, mapDiscordLocale } from '../../locales/index.js';
import { logger } from '../../utils/logger.js';

// Import shared utilities
import {
  GAMES_PER_PAGE,
  USERS_PER_PAGE,
  ONE_DAY,
  ONE_WEEK,
  ONE_MONTH,
  THREE_MONTHS,
  SIX_MONTHS,
  ONE_YEAR,
  CACHE_TTL,
  gameCache,
  userCache,
  formatHoursShort,
  resolveSteamId,
  buildButtons,
} from './shared.js';

// ============ Subcommand Handlers ============

async function handleProfile(
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

  if (playerInfo.realName)
    profileInfo.push(
      `**${t('steam.profile.realName', locale)}:** ${playerInfo.realName}`
    );
  if (playerInfo.country)
    profileInfo.push(
      `**${t('steam.profile.country', locale)}:** ${playerInfo.country}`
    );
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

  const embed = createEmbed({
    title: playerInfo.name,
    description,
    color: embedColor,
    fields,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlaytime(
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
      const bar = formatPlaytimeWithBar(game.playtimeForever, maxPlaytime, locale);
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

async function handleGames(
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
        logger.debug(`Failed to disable games pagination buttons: ${e.message}`);
      });
  });
}

async function handleRecent(
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
      const bar = formatPlaytimeWithBar(game.playtime_2weeks, maxRecent, locale);
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

async function handleRanking(
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

  const guild = interaction.guild as Guild;
  // Use cache when available, fetch only if cache is significantly smaller
  // Note: GuildMembers intent is required for full member list
  if (guild.members.cache.size < guild.memberCount * 0.5) {
    await guild.members.fetch({ limit: 1000 });
  }
  const memberIds = guild.members.cache.map((m) => m.id);
  const registeredUsers = getSteamUsersByDiscordIds(memberIds);

  if (registeredUsers.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('steam.ranking.noRegistered', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const loadingEmbed = createEmbed({
    title: t('common.loading', locale),
    description: t('steam.ranking.loading', locale, {
      count: registeredUsers.length,
    }),
    color: COLORS.STEAM,
  });
  await interaction.editReply({ embeds: [loadingEmbed] });

  interface RankedUser {
    discordId: string;
    steamName: string;
    totalPlaytime: number;
  }

  // Filter users who are still in the guild
  const validUsers = registeredUsers.filter((user) =>
    guild.members.cache.has(user.discord_id)
  );

  // Process users in parallel batches to avoid rate limiting
  const BATCH_SIZE = 5;
  const rankedUsers: RankedUser[] = [];

  for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
    const batch = validUsers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (user) => {
        const [totalPlaytime, playerInfo] = await Promise.all([
          steamClient.getTotalPlaytime(user.steam_id),
          steamClient.getFormattedPlayerInfo(user.steam_id),
        ]);

        return {
          discordId: user.discord_id,
          steamName: playerInfo?.name || user.steam_name || 'Unknown',
          totalPlaytime,
        };
      })
    );

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        rankedUsers.push(result.value);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < validUsers.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (rankedUsers.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('steam.ranking.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  rankedUsers.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  const totalPages = Math.ceil(rankedUsers.length / USERS_PER_PAGE);
  const maxPlaytime = rankedUsers[0].totalPlaytime;
  let currentPage = 0;

  const totalHours = rankedUsers.reduce(
    (sum, u) => sum + Math.floor(u.totalPlaytime / 60),
    0
  );
  const avgHours = Math.floor(totalHours / rankedUsers.length);

  const buildRankingEmbed = (page: number) => {
    const startIndex = page * USERS_PER_PAGE;
    const pageUsers = rankedUsers.slice(
      startIndex,
      startIndex + USERS_PER_PAGE
    );

    const rankingList = pageUsers
      .map((user, index) => {
        const rank = startIndex + index + 1;
        const medal =
          rank <= 3 ? `${rank}.` : `\`${rank.toString().padStart(2, ' ')}\``;
        const bar = formatPlaytimeWithBar(user.totalPlaytime, maxPlaytime);
        return `${medal} **${user.steamName}** (<@${user.discordId}>)\n    ${bar}`;
      })
      .join('\n\n');

    return createEmbed({
      title: `${guild.name} - ${t('steam.ranking.title', locale)}`,
      description: `**${t('steam.ranking.totalPlayers', locale)}:** ${rankedUsers.length}\n**${t('steam.ranking.combined', locale)}:** ${totalHours.toLocaleString()} ${t('units.hours', locale)}\n**${t('steam.ranking.average', locale)}:** ${avgHours.toLocaleString()} ${t('units.hoursPerPlayer', locale)}\n\n${rankingList}`,
      color: COLORS.STEAM,
      footer: t('steam.ranking.page', locale, {
        current: page + 1,
        total: totalPages,
      }),
      timestamp: true,
    });
  };

  const embed = buildRankingEmbed(currentPage);
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
      embeds: [buildRankingEmbed(currentPage)],
      components: [buildButtons(currentPage, totalPages)],
    });
  });

  collector.on('end', async () => {
    await interaction
      .editReply({ components: [buildButtons(currentPage, totalPages, true)] })
      .catch((e) => {
        logger.debug(`Failed to disable ranking pagination buttons: ${e.message}`);
      });
  });
}

async function handleHistory(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = getSteamId(discordId);

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

  const now = Date.now();
  const periods = [
    { name: t('steam.history.periods.day', locale), duration: ONE_DAY },
    { name: t('steam.history.periods.week', locale), duration: ONE_WEEK },
    { name: t('steam.history.periods.month', locale), duration: ONE_MONTH },
    {
      name: t('steam.history.periods.threeMonths', locale),
      duration: THREE_MONTHS,
    },
    {
      name: t('steam.history.periods.sixMonths', locale),
      duration: SIX_MONTHS,
    },
    { name: t('steam.history.periods.year', locale), duration: ONE_YEAR },
  ];

  const periodDisplay = periods
    .map((period) => {
      const change = getPlaytimeChange(discordId, now - period.duration, now);
      if (change === 0)
        return `**${period.name}:** ${t('common.noData', locale)}`;
      const formatted = formatPlaytime(change, locale);
      const dailyAvg = Math.round(change / (period.duration / ONE_DAY));
      return `**${period.name}:** +${formatted} (~${formatPlaytime(dailyAvg, locale)}/${t('units.perDay', locale)})`;
    })
    .join('\n');

  const hasHistory = periods.some(
    (p) => getPlaytimeChange(discordId, now - p.duration, now) > 0
  );

  if (!hasHistory) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('steam.history.notEnoughData', locale) +
        '\n' +
        t('steam.history.recordedDaily', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const totalPlaytime = await steamClient.getTotalPlaytime(steamId);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${t('steam.history.title', locale)}`,
    description: `**${t('steam.history.currentTotal', locale)}:** ${formatPlaytime(totalPlaytime, locale)}\n\n**${t('steam.history.playtimeAdded', locale)}:**\n${periodDisplay}`,
    color: COLORS.STEAM,
    fields: [
      {
        name: t('steam.history.howItWorks', locale),
        value: t('steam.history.recordedDaily', locale),
        inline: false,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    footer: t('steam.history.trackedFrom', locale),
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRegister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const input = interaction.options.getString('steamid', true);
  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  const steamId = await steamClient.getSteamId64(input);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      t('steam.errors.invalidSteamId', locale) +
        '\n\n' +
        t('steam.register.validFormats', locale)
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

  registerSteamUser(discordId, steamId, playerInfo.name);

  const embed = createEmbed({
    title: t('steam.register.title', locale),
    description: existing
      ? t('steam.register.updated', locale)
      : t('steam.register.linked', locale),
    color: COLORS.SUCCESS,
    fields: [
      {
        name: t('steam.profile.title', locale),
        value: `**${playerInfo.name}**\n[${t('steam.register.viewProfile', locale)}](${playerInfo.profileUrl})`,
        inline: true,
      },
      {
        name: t('steam.profile.steamId', locale),
        value: `\`${steamId}\``,
        inline: true,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleUnregister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  if (!existing) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.unregister.notRegistered', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  unregisterSteamUser(discordId);

  const embed = createEmbed({
    title: t('steam.unregister.title', locale),
    description: t('steam.unregister.unlinked', locale),
    color: COLORS.SUCCESS,
    fields: [
      {
        name: t('steam.unregister.removedAccount', locale),
        value: `**${existing.steam_name || 'Unknown'}**\n\`${existing.steam_id}\``,
        inline: false,
      },
    ],
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleWhoami(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const discordId = interaction.user.id;
  const steamUser = getSteamUser(discordId);

  if (!steamUser) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.whoami.notRegistered', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(
    steamUser.steam_id
  );

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.errors.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  const registeredAt = new Date(steamUser.registered_at).toLocaleDateString(
    dateLocale,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const statusDisplay = playerInfo.currentGame
    ? `**${t('steam.profile.playing', locale)}:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const embed = createEmbed({
    title: t('steam.whoami.title', locale),
    description: `**${playerInfo.name}**\n\n${statusDisplay}\n\n[${t('steam.whoami.viewProfile', locale)}](${playerInfo.profileUrl})`,
    color: embedColor,
    fields: [
      {
        name: t('steam.profile.steamId', locale),
        value: `\`${steamUser.steam_id}\``,
        inline: true,
      },
      {
        name: t('steam.whoami.linkedSince', locale),
        value: registeredAt,
        inline: true,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  const embed = createEmbed({
    title: t('steam.help.title', locale),
    description: t('steam.help.description', locale),
    color: COLORS.STEAM,
    fields: [
      {
        name: t('steam.help.accountSection', locale),
        value: t('steam.help.accountCommands', locale),
        inline: false,
      },
      {
        name: t('steam.help.statsSection', locale),
        value: t('steam.help.statsCommands', locale),
        inline: false,
      },
      {
        name: t('steam.help.optionsSection', locale),
        value: t('steam.help.optionsDesc', locale),
        inline: false,
      },
    ],
    footer: t('steam.help.autocompleteHint', locale),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleChart(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const steamId = getSteamId(targetUser.id);

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

async function handleHistoryGraph(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = getSteamId(discordId);

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

  const periodOption = interaction.options.getString('period') ?? '30d';
  const periodMap: Record<string, number> = {
    '7d': 7 * ONE_DAY,
    '30d': 30 * ONE_DAY,
    '90d': 90 * ONE_DAY,
    '1y': 365 * ONE_DAY,
  };

  const periodDuration = periodMap[periodOption] ?? 30 * ONE_DAY;
  const startTime = Date.now() - periodDuration;

  // Get the baseline record at or before the start time for accurate playtime calculation
  // This prevents undercounting when the first record after startTime is delayed (e.g., midnight JST recording)
  const baselineRecord = getClosestRecordBefore(discordId, startTime);
  const history = getPlaytimeHistory(discordId, startTime);

  if (history.length < 1) {
    // No history data, show current playtime only
    const totalPlaytime = await steamClient.getTotalPlaytime(steamId);
    const totalHours = Math.floor(totalPlaytime / 60);

    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      `${t('steam.history.notEnoughData', locale)}\n\n**${t('steam.history.currentTotalPlaytime', locale)}:** ${totalHours.toLocaleString()} ${t('units.hours', locale)}\n\n${t('steam.historyGraph.recordedDaily', locale)}`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  const labels = history.map((h) => {
    const date = new Date(h.recorded_at);
    // Use JST timezone to match the recording time (midnight JST)
    // Include year for 1y period to avoid duplicate labels across years
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
      ...(periodOption === '1y' && { year: '2-digit' }),
    };
    return date.toLocaleDateString(dateLocale, options);
  });
  const data = history.map((h) => Math.floor(h.total_playtime / 60));

  const chartBuffer = await createLineChart(
    labels,
    data,
    t('steam.chart.totalPlaytimeAxis', locale)
  );

  const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

  // Use the baseline record if available for more accurate playtime calculation
  // Falls back to the first record in the history if no baseline exists
  const firstRecord = baselineRecord ?? history[0];
  const lastRecord = history[history.length - 1];
  const playtimeGain = Math.floor(
    (lastRecord.total_playtime - firstRecord.total_playtime) / 60
  );

  const periodLabels: Record<string, string> =
    locale === 'ja'
      ? { '7d': '7日間', '30d': '30日間', '90d': '90日間', '1y': '1年' }
      : { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', '1y': '1 Year' };

  const playtimePrefix = playtimeGain >= 0 ? '+' : '';
  const playtimeLabel =
    playtimeGain >= 0
      ? t('steam.historyGraph.playtimeAdded', locale)
      : t('steam.historyGraph.playtimeChange', locale);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${t('steam.historyGraph.title', locale)}`,
    description: `**${t('steam.historyGraph.period', locale)}:** ${periodLabels[periodOption] ?? periodLabels['30d']}\n**${playtimeLabel}:** ${playtimePrefix}${playtimeGain.toLocaleString()} ${t('units.hours', locale)}`,
    color: COLORS.STEAM,
    image: 'attachment://chart.png',
    thumbnail: playerInfo.avatarUrl,
    footer: t('steam.historyGraph.recordedDaily', locale),
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

// ============ Autocomplete Handler ============

async function handleAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focusedOption = interaction.options.getFocused(true);

  // Handle game autocomplete
  if (focusedOption.name === 'game') {
    const query = focusedOption.value;
    const discordId = interaction.user.id;
    const steamId = getSteamId(discordId);

    if (!steamId) {
      await interaction.respond([]);
      return;
    }

    // Check cache
    const cached = gameCache.get(discordId);
    let games: { name: string; playtime: number }[];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      games = cached.games;
    } else {
      // Fetch games from Steam
      const ownedGames = await steamClient.getOwnedGames(steamId);
      games = ownedGames
        .filter((g) => g.name)
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .map((g) => ({ name: g.name!, playtime: g.playtime_forever }));

      gameCache.set(discordId, { games, timestamp: Date.now() });
    }

    // Filter with fuzzy search and limit results
    const filtered = smartFilter(games, query, (g) => g.name)
      .slice(0, 25)
      .map((g) => {
        const displayName = `${g.name} (${formatHoursShort(g.playtime)})`;
        return {
          name: displayName.slice(0, 100),
          value: g.name.slice(0, 100),
        };
      });

    await interaction.respond(filtered);
    return;
  }

  // Handle steamid autocomplete
  if (focusedOption.name === 'steamid') {
    const query = focusedOption.value;

    // Get all registered users (with caching)
    let users: { name: string; steamId: string }[];

    if (userCache && Date.now() - userCache.timestamp < CACHE_TTL) {
      users = userCache.users;
    } else {
      const allUsers = getAllSteamUsers();
      users = allUsers.map((u) => ({
        name: u.steam_name || 'Unknown',
        steamId: u.steam_id,
      }));
      userCache.users = users;
      userCache.timestamp = Date.now();
    }

    // Filter with fuzzy search
    const filtered = smartFilter(users, query, (u) => u.name)
      .slice(0, 25)
      .map((u) => {
        const shortId = u.steamId.slice(-6);
        const displayName = `${u.name} (...${shortId})`;
        return {
          name: displayName.slice(0, 100),
          value: u.steamId,
        };
      });

    await interaction.respond(filtered);
    return;
  }
}

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('steam')
    .setDescription('Steam integration commands')
    // Profile
    .addSubcommand((sub) =>
      sub
        .setName('profile')
        .setDescription('View Steam profile information')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // Playtime
    .addSubcommand((sub) =>
      sub
        .setName('playtime')
        .setDescription('View game playtime')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt.setName('game').setDescription('Game name').setAutocomplete(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // Games
    .addSubcommand((sub) =>
      sub
        .setName('games')
        .setDescription('Browse game library')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // Recent
    .addSubcommand((sub) =>
      sub
        .setName('recent')
        .setDescription('View recently played games')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // Ranking
    .addSubcommand((sub) =>
      sub.setName('ranking').setDescription('View server playtime ranking')
    )
    // History
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View playtime history')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // Chart
    .addSubcommand((sub) =>
      sub
        .setName('chart')
        .setDescription('View playtime chart')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    // History Graph
    .addSubcommand((sub) =>
      sub
        .setName('history-graph')
        .setDescription('View playtime history graph')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
        .addStringOption((opt) =>
          opt
            .setName('period')
            .setDescription('Time period')
            .addChoices(
              { name: '7 Days', value: '7d' },
              { name: '30 Days', value: '30d' },
              { name: '90 Days', value: '90d' },
              { name: '1 Year', value: '1y' }
            )
        )
    )
    // Register
    .addSubcommand((sub) =>
      sub
        .setName('register')
        .setDescription('Link your Steam account')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or custom URL')
            .setRequired(true)
        )
    )
    // Unregister
    .addSubcommand((sub) =>
      sub.setName('unregister').setDescription('Unlink your Steam account')
    )
    // Whoami
    .addSubcommand((sub) =>
      sub.setName('whoami').setDescription('Show your linked account')
    )
    // Help
    .addSubcommand((sub) =>
      sub.setName('help').setDescription('Show command help')
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 5000,
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'profile':
        await handleProfile(interaction);
        break;
      case 'playtime':
        await handlePlaytime(interaction);
        break;
      case 'games':
        await handleGames(interaction);
        break;
      case 'recent':
        await handleRecent(interaction);
        break;
      case 'ranking':
        await handleRanking(interaction);
        break;
      case 'history':
        await handleHistory(interaction);
        break;
      case 'chart':
        await handleChart(interaction);
        break;
      case 'history-graph':
        await handleHistoryGraph(interaction);
        break;
      case 'register':
        await handleRegister(interaction);
        break;
      case 'unregister':
        await handleUnregister(interaction);
        break;
      case 'whoami':
        await handleWhoami(interaction);
        break;
      case 'help':
        await handleHelp(interaction);
        break;
    }
  },

  async autocomplete(interaction) {
    await handleAutocomplete(interaction);
  },
};

export default command;
