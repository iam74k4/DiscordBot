import { ChatInputCommandInteraction, Guild, MessageFlags } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import {
  steamClient,
  formatPlaytimeWithBar,
} from '../integrations/steam/index.js';
import { steamUserRepository } from '../repositories/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { env } from '../../../config/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { USERS_PER_PAGE } from '../domain/shared.js';
import { withTimeout } from '../../../shared/utils/timeout.js';
import { sendPaginatedMessage } from '../../../shared/utils/pagination.js';

export async function handleRanking(
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
  if (guild.members.cache.size < guild.memberCount * 0.5) {
    await withTimeout(guild.members.fetch({ limit: 1000 }), 10_000).catch(
      (e) => {
        logger.warn(`guild.members.fetch timed out: ${getErrorMessage(e)}`);
      }
    );
  }
  const memberIds = guild.members.cache.map((m) => m.id);
  const registeredUsers = steamUserRepository.getByDiscordIds(memberIds);

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
    timestamp: false,
  });
  await interaction.editReply({ embeds: [loadingEmbed] });

  interface RankedUser {
    discordId: string;
    steamName: string;
    totalPlaytime: number;
  }

  const validUsers = registeredUsers.filter((user) =>
    guild.members.cache.has(user.discord_id)
  );

  const BATCH_SIZE = env.STEAM_RANKING_BATCH_SIZE;
  const rankedUsers: RankedUser[] = [];

  for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
    const batch = validUsers.slice(i, i + BATCH_SIZE);
    const summaries = await withTimeout(
      steamClient.getPlayerSummaries(batch.map((user) => user.steam_id)),
      10_000
    ).catch((e) => {
      logger.warn(`getPlayerSummaries timed out: ${getErrorMessage(e)}`);
      return [];
    });
    const summaryBySteamId = new Map(
      summaries.map((summary) => [summary.steamid, summary])
    );

    const results = await Promise.allSettled(
      batch.map(async (user) => {
        const totalPlaytime = await withTimeout(
          steamClient.getTotalPlaytime(user.steam_id),
          10_000
        );
        const playerInfo = summaryBySteamId.get(user.steam_id);

        return {
          discordId: user.discord_id,
          steamName: playerInfo?.personaname || user.steam_name || 'Unknown',
          totalPlaytime,
        };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        rankedUsers.push(result.value);
      }
    }

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

  const maxPlaytime = rankedUsers[0].totalPlaytime;

  const totalHours = rankedUsers.reduce(
    (sum, u) => sum + Math.floor(u.totalPlaytime / 60),
    0
  );
  const avgHours = Math.floor(totalHours / rankedUsers.length);

  await sendPaginatedMessage<RankedUser>({
    items: rankedUsers,
    itemsPerPage: USERS_PER_PAGE,
    interaction,
    onlyOwnerMessage: t('steam.errors.onlyCommandUser', locale),
    formatPage: (pageUsers, page, totalPages) => {
      const startIndex = page * USERS_PER_PAGE;

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
      });
    },
  });
}
