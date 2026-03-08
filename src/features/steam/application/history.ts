import { ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { steamClient, formatPlaytime } from '../services/steam/index.js';
import {
  playtimeRepository,
  steamUserRepository,
} from '../repositories/index.js';
import { createLineChart } from '../../../utils/chart.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  ONE_DAY,
  ONE_WEEK,
  ONE_MONTH,
  THREE_MONTHS,
  SIX_MONTHS,
  ONE_YEAR,
} from '../lib/shared.js';

export async function handleHistory(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = steamUserRepository.getSteamId(discordId);

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
      const change = playtimeRepository.getPlaytimeChange(
        discordId,
        now - period.duration,
        now
      );
      if (change === 0)
        return `**${period.name}:** ${t('common.noData', locale)}`;
      const formatted = formatPlaytime(change, locale);
      const dailyAvg = Math.round(change / (period.duration / ONE_DAY));
      return `**${period.name}:** +${formatted} (~${formatPlaytime(dailyAvg, locale)}/${t('units.perDay', locale)})`;
    })
    .join('\n');

  const hasHistory = periods.some(
    (p) =>
      playtimeRepository.getPlaytimeChange(discordId, now - p.duration, now) > 0
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

export async function handleHistoryGraph(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const steamId = steamUserRepository.getSteamId(discordId);

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

  const baselineRecord = playtimeRepository.getClosestRecordBefore(
    discordId,
    startTime
  );
  const history = playtimeRepository.getHistory(discordId, startTime);

  if (history.length < 1) {
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
