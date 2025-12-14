import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
import { COLORS, TITLES } from '../../utils/constants.js';
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
  getAllSteamUsers,
} from '../../services/database/index.js';
import { smartFilter } from '../../utils/fuzzy.js';
import {
  createHorizontalBarChart,
  createLineChart,
} from '../../utils/chart.js';

// Constants
const GAMES_PER_PAGE = 10;
const USERS_PER_PAGE = 10;
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const THREE_MONTHS = 90 * ONE_DAY;
const SIX_MONTHS = 180 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

// Cache for autocomplete
interface GameCacheEntry {
  games: { name: string; playtime: number }[];
  timestamp: number;
}
const gameCache = new Map<string, GameCacheEntry>();
const userCache: {
  users: { name: string; steamId: string }[];
  timestamp: number;
} = { users: [], timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Format hours for autocomplete display
 */
function formatHoursShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k h`;
  }
  return `${hours.toLocaleString()}h`;
}

/**
 * Get Steam ID from interaction options
 */
async function resolveSteamId(
  interaction: ChatInputCommandInteraction,
  requireRegistration: boolean = false
): Promise<{ steamId: string | null; error?: string }> {
  const inputSteamId = interaction.options.getString('steamid');
  const targetUser = interaction.options.getUser('user');

  if (inputSteamId) {
    const steamId = await steamClient.getSteamId64(inputSteamId);
    if (!steamId) {
      return { steamId: null, error: 'Invalid Steam ID format' };
    }
    return { steamId };
  }

  if (targetUser) {
    const steamId = getSteamId(targetUser.id);
    if (!steamId) {
      return {
        steamId: null,
        error: `**${targetUser.displayName}** has not linked their Steam account.`,
      };
    }
    return { steamId };
  }

  const steamId = getSteamId(interaction.user.id);
  if (!steamId && requireRegistration) {
    return {
      steamId: null,
      error: `You haven't linked your Steam account yet.\nUse \`/steam register\` to link your account.`,
    };
  }

  return { steamId };
}

/**
 * Build pagination buttons
 */
function buildButtons(
  page: number,
  totalPages: number,
  disabled: boolean = false
) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('first')
      .setLabel('<<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('<')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('page')
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('>')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('last')
      .setLabel('>>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1)
  );
}

// ============ Subcommand Handlers ============

async function handleProfile(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(TITLES.NOT_FOUND, error!);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const statusDisplay = playerInfo.currentGame
    ? `**Playing:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const visibilityInfo = `${getVisibilityIcon(playerInfo.isPublic)} ${playerInfo.isPublic ? 'Public Profile' : 'Private Profile'}`;

  let description = `${visibilityInfo}\n\n${statusDisplay}`;
  if (!playerInfo.isPublic) {
    description +=
      '\n\n*Some information may be hidden due to privacy settings.*';
  }

  const fields = [];
  const profileInfo = [];

  if (playerInfo.realName)
    profileInfo.push(`**Real Name:** ${playerInfo.realName}`);
  if (playerInfo.country)
    profileInfo.push(`**Country:** ${playerInfo.country}`);
  if (playerInfo.createdAt) {
    const memberSince = playerInfo.createdAt.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    profileInfo.push(`**Member Since:** ${memberSince}`);
  }

  if (profileInfo.length > 0) {
    fields.push({
      name: 'Profile Info',
      value: profileInfo.join('\n'),
      inline: false,
    });
  }

  fields.push({
    name: 'Steam ID',
    value: `\`${playerInfo.steamId}\``,
    inline: true,
  });
  fields.push({
    name: 'Profile Link',
    value: `[View on Steam](${playerInfo.profileUrl})`,
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
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction);
  const gameName = interaction.options.getString('game');

  if (!steamId) {
    const errorEmbed = createErrorEmbed(TITLES.NOT_FOUND, error!);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'Could not retrieve player information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!playerInfo.isPublic) {
    const warningEmbed = createWarningEmbed(
      TITLES.PRIVATE_PROFILE,
      `**${playerInfo.name}** has a private profile.`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  if (gameName) {
    const game = await steamClient.findGameByName(steamId, gameName);

    if (!game) {
      const errorEmbed = createErrorEmbed(
        TITLES.NOT_FOUND,
        `Could not find a game matching **"${gameName}"**.`
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const fields = [
      {
        name: 'Total Playtime',
        value: `**${game.playtimeForeverFormatted}**`,
        inline: true,
      },
    ];

    if (game.playtime2WeeksFormatted) {
      fields.push({
        name: 'Last 2 Weeks',
        value: `**${game.playtime2WeeksFormatted}**`,
        inline: true,
      });
    }

    const embed = createEmbed({
      title: game.name,
      description: `Playtime for **${playerInfo.name}**\n\n[View on Steam Store](${game.storeUrl})`,
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
      TITLES.NOT_FOUND,
      `**${playerInfo.name}** has no games.`
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
      const bar = formatPlaytimeWithBar(game.playtimeForever, maxPlaytime);
      return `${medal} **${game.name}**\n${bar}`;
    })
    .join('\n\n');

  const totalHours = Math.floor(totalMinutes / 60);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${TITLES.PLAYTIME}`,
    description: `**Total Playtime:** ${formatPlaytime(totalMinutes)}\n**Total Games:** ${games.length}+`,
    color: COLORS.STEAM,
    fields: [{ name: 'Top 5 Games', value: topGamesList, inline: false }],
    thumbnail: playerInfo.avatarUrl,
    footer: `${totalHours.toLocaleString()} hours total`,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleGames(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(TITLES.NOT_FOUND, error!);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'Could not retrieve player information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!playerInfo.isPublic) {
    const warningEmbed = createWarningEmbed(
      TITLES.PRIVATE_PROFILE,
      `**${playerInfo.name}** has a private profile.`
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
      TITLES.NOT_FOUND,
      `**${playerInfo.name}** has no games.`
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
      title: `${playerInfo.name} - ${TITLES.GAMES}`,
      description: `**Total Games:** ${games.length}\n\n${gamesList}`,
      color: COLORS.STEAM,
      thumbnail: playerInfo.avatarUrl,
      footer: `Page ${page + 1} / ${totalPages}`,
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
        content: 'Only the command user can navigate.',
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
      .catch(() => {});
  });
}

async function handleRecent(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(TITLES.NOT_FOUND, error!);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'Could not retrieve player information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!playerInfo.isPublic) {
    const warningEmbed = createWarningEmbed(
      TITLES.PRIVATE_PROFILE,
      `**${playerInfo.name}** has a private profile.`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const recentGames = await steamClient.getRecentlyPlayedGames(steamId, 10);

  if (recentGames.length === 0) {
    const embed = createEmbed({
      title: `${playerInfo.name} - ${TITLES.RECENT}`,
      description: '**No games played in the last 2 weeks.**',
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
      const bar = formatPlaytimeWithBar(game.playtime_2weeks, maxRecent);
      const totalTime = formatPlaytime(game.playtime_forever);
      return `${medal} **[${game.name}](${getStoreUrl(game.appid)})**\n    ${bar}\n    Total: ${totalTime}`;
    })
    .join('\n\n');

  const dailyAverage = Math.round(totalRecentMinutes / 14);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${TITLES.RECENT}`,
    description: `**Last 2 Weeks:** ${formatPlaytime(totalRecentMinutes)}\n**Daily Average:** ~${formatPlaytime(dailyAverage)}\n\n${gamesList}`,
    color: COLORS.STEAM,
    thumbnail: playerInfo.avatarUrl,
    footer: 'Activity from the last 14 days',
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRanking(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild as Guild;
  await guild.members.fetch();
  const memberIds = guild.members.cache.map((m) => m.id);
  const registeredUsers = getSteamUsersByDiscordIds(memberIds);

  if (registeredUsers.length === 0) {
    const warningEmbed = createWarningEmbed(
      TITLES.WARNING,
      'No one in this server has linked their Steam account.'
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const loadingEmbed = createEmbed({
    title: TITLES.LOADING,
    description: `Fetching playtime data for ${registeredUsers.length} users...`,
    color: COLORS.STEAM,
  });
  await interaction.editReply({ embeds: [loadingEmbed] });

  interface RankedUser {
    discordId: string;
    steamName: string;
    totalPlaytime: number;
  }

  const rankedUsers: RankedUser[] = [];

  for (const user of registeredUsers) {
    try {
      const member = guild.members.cache.get(user.discord_id);
      if (!member) continue;

      const totalPlaytime = await steamClient.getTotalPlaytime(user.steam_id);
      const playerInfo = await steamClient.getFormattedPlayerInfo(
        user.steam_id
      );

      rankedUsers.push({
        discordId: user.discord_id,
        steamName: playerInfo?.name || user.steam_name || 'Unknown',
        totalPlaytime,
      });
    } catch {
      continue;
    }
  }

  if (rankedUsers.length === 0) {
    const warningEmbed = createWarningEmbed(
      TITLES.WARNING,
      'Could not retrieve playtime data.'
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
      title: `${guild.name} - ${TITLES.RANKING}`,
      description: `**Total Players:** ${rankedUsers.length}\n**Combined:** ${totalHours.toLocaleString()} hours\n**Average:** ${avgHours.toLocaleString()} hours/player\n\n${rankingList}`,
      color: COLORS.STEAM,
      footer: `Page ${page + 1} / ${totalPages}`,
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
        content: 'Only the command user can navigate.',
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
      .catch(() => {});
  });
}

async function handleHistory(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = getSteamId(discordId);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      targetUser.id === interaction.user.id
        ? "You haven't linked your Steam account yet."
        : `**${targetUser.displayName}** has not linked their Steam account.`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const now = Date.now();
  const periods = [
    { name: '24 Hours', duration: ONE_DAY },
    { name: '7 Days', duration: ONE_WEEK },
    { name: '30 Days', duration: ONE_MONTH },
    { name: '3 Months', duration: THREE_MONTHS },
    { name: '6 Months', duration: SIX_MONTHS },
    { name: '1 Year', duration: ONE_YEAR },
  ];

  const periodDisplay = periods
    .map((period) => {
      const change = getPlaytimeChange(discordId, now - period.duration, now);
      if (change === 0) return `**${period.name}:** No data`;
      const formatted = formatPlaytime(change);
      const dailyAvg = Math.round(change / (period.duration / ONE_DAY));
      return `**${period.name}:** +${formatted} (~${formatPlaytime(dailyAvg)}/day)`;
    })
    .join('\n');

  const hasHistory = periods.some(
    (p) => getPlaytimeChange(discordId, now - p.duration, now) > 0
  );

  if (!hasHistory) {
    const warningEmbed = createWarningEmbed(
      TITLES.WARNING,
      `No playtime history available.\nHistory is recorded daily at midnight.`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const totalPlaytime = await steamClient.getTotalPlaytime(steamId);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${TITLES.HISTORY}`,
    description: `**Current Total:** ${formatPlaytime(totalPlaytime)}\n\n**Playtime Added:**\n${periodDisplay}`,
    color: COLORS.STEAM,
    fields: [
      {
        name: 'How This Works',
        value: 'Playtime is recorded daily at midnight (JST).',
        inline: false,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    footer: 'History is tracked from registration date',
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRegister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const input = interaction.options.getString('steamid', true);
  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  const steamId = await steamClient.getSteamId64(input);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'Could not find a Steam account with that ID.\n\n**Valid formats:**\n• Steam ID: `76561198xxxxxxxxx`\n• Custom URL: `customname`\n• Profile URL: `https://steamcommunity.com/id/customname`'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  registerSteamUser(discordId, steamId, playerInfo.name);

  const embed = createEmbed({
    title: TITLES.REGISTER,
    description: existing
      ? 'Your linked Steam account has been updated.'
      : 'Your Discord account is now linked to Steam!',
    color: COLORS.SUCCESS,
    fields: [
      {
        name: 'Steam Profile',
        value: `**${playerInfo.name}**\n[View Profile](${playerInfo.profileUrl})`,
        inline: true,
      },
      { name: 'Steam ID', value: `\`${steamId}\``, inline: true },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleUnregister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  if (!existing) {
    const warningEmbed = createWarningEmbed(
      TITLES.NOT_FOUND,
      'Your Discord account is not linked to any Steam account.'
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  unregisterSteamUser(discordId);

  const embed = createEmbed({
    title: TITLES.UNREGISTER,
    description: 'Your Discord account has been unlinked from Steam.',
    color: COLORS.SUCCESS,
    fields: [
      {
        name: 'Removed Account',
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
  await interaction.deferReply();

  const discordId = interaction.user.id;
  const steamUser = getSteamUser(discordId);

  if (!steamUser) {
    const warningEmbed = createWarningEmbed(
      TITLES.NOT_FOUND,
      'Your Discord account is not linked to any Steam account.\n\nUse `/steam register` to link your account.'
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(
    steamUser.steam_id
  );

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const registeredAt = new Date(steamUser.registered_at).toLocaleDateString(
    'ja-JP',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const statusDisplay = playerInfo.currentGame
    ? `**Playing:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const embed = createEmbed({
    title: TITLES.WHOAMI,
    description: `**${playerInfo.name}**\n\n${statusDisplay}\n\n[View Profile](${playerInfo.profileUrl})`,
    color: embedColor,
    fields: [
      { name: 'Steam ID', value: `\`${steamUser.steam_id}\``, inline: true },
      { name: 'Linked Since', value: registeredAt, inline: true },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = createEmbed({
    title: TITLES.HELP,
    description:
      'Link your Discord account to Steam for easy access to your stats!',
    color: COLORS.STEAM,
    fields: [
      {
        name: 'Account',
        value:
          '`/steam register <steamid>` - Link account\n`/steam unregister` - Unlink account\n`/steam whoami` - Show linked account',
        inline: false,
      },
      {
        name: 'Stats',
        value:
          '`/steam profile` - View profile\n`/steam playtime [game]` - View playtime\n`/steam games` - Browse library\n`/steam recent` - Recent activity\n`/steam ranking` - Server leaderboard\n`/steam history` - Playtime over time',
        inline: false,
      },
      {
        name: 'Options',
        value:
          '• `steamid` - Look up any Steam user\n• `user` - Look up a Discord user\n• `game` - Search for a specific game',
        inline: false,
      },
    ],
    footer: 'Use Tab to autocomplete game names!',
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleChart(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const steamId = getSteamId(targetUser.id);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      targetUser.id === interaction.user.id
        ? "You haven't linked your Steam account yet.\nUse `/steam register` to link your account."
        : `**${targetUser.displayName}** has not linked their Steam account.`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!playerInfo.isPublic) {
    const warningEmbed = createWarningEmbed(
      TITLES.PRIVATE_PROFILE,
      `**${playerInfo.name}** has a private profile.`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const games = await steamClient.getFormattedGames(steamId, 'playtime', 10);

  if (games.length === 0) {
    const warningEmbed = createWarningEmbed(
      TITLES.NOT_FOUND,
      `**${playerInfo.name}** has no games.`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const labels = games.map((g) => g.name);
  const data = games.map((g) => Math.floor(g.playtimeForever / 60));

  const chartBuffer = await createHorizontalBarChart(
    labels,
    data,
    'Playtime (hours)'
  );

  const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

  const totalHours = data.reduce((sum, h) => sum + h, 0);

  const embed = createEmbed({
    title: `${playerInfo.name} - ${TITLES.CHART}`,
    description: `**Top ${games.length} Games**\nTotal: ${totalHours.toLocaleString()} hours`,
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
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = getSteamId(discordId);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      targetUser.id === interaction.user.id
        ? "You haven't linked your Steam account yet.\nUse `/steam register` to link your account."
        : `**${targetUser.displayName}** has not linked their Steam account.`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'Could not retrieve Steam profile information.'
    );
    await interaction.editReply({ embeds: [errorEmbed] });
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

  const history = getPlaytimeHistory(discordId, startTime);

  if (history.length < 2) {
    // No history data, show current playtime only
    const totalPlaytime = await steamClient.getTotalPlaytime(steamId);
    const totalHours = Math.floor(totalPlaytime / 60);

    const warningEmbed = createWarningEmbed(
      TITLES.WARNING,
      `Not enough history data available.\n\n**Current Total Playtime:** ${totalHours.toLocaleString()} hours\n\nHistory is recorded daily at midnight (JST).`
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const labels = history.map((h) => {
    const date = new Date(h.recorded_at);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const data = history.map((h) => Math.floor(h.total_playtime / 60));

  const chartBuffer = await createLineChart(
    labels,
    data,
    'Total Playtime (hours)'
  );

  const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

  const firstRecord = history[0];
  const lastRecord = history[history.length - 1];
  const playtimeGain = Math.floor(
    (lastRecord.total_playtime - firstRecord.total_playtime) / 60
  );

  const periodLabels: Record<string, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
    '1y': '1 Year',
  };

  const embed = createEmbed({
    title: `${playerInfo.name} - ${TITLES.HISTORY_GRAPH}`,
    description: `**Period:** ${periodLabels[periodOption]}\n**Playtime Added:** +${playtimeGain.toLocaleString()} hours`,
    color: COLORS.STEAM,
    image: 'attachment://chart.png',
    thumbnail: playerInfo.avatarUrl,
    footer: 'History is recorded daily at midnight (JST)',
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
