import {
  ChatInputCommandInteraction,
  ComponentType,
  Guild,
  MessageFlags,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { steamClient, formatPlaytimeWithBar } from '../services/steam/index.js';
import { steamUserRepository } from '../repositories/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { logger } from '../../../utils/logger.js';
import { USERS_PER_PAGE, buildButtons } from '../lib/shared.js';

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
    await guild.members.fetch({ limit: 1000 });
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
        logger.debug(
          `Failed to disable ranking pagination buttons: ${e.message}`
        );
      });
  });
}
