import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { voiceSessionRepository } from '../repositories/voiceSessionRepository.js';

type Period = 'today' | 'week' | 'month' | 'all';

function getPeriodSince(period: Period): number | undefined {
  const now = Date.now();
  switch (period) {
    case 'today': {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'week':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return now - 30 * 24 * 60 * 60 * 1000;
    case 'all':
      return undefined;
  }
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const period = (interaction.options.getString('period') ?? 'all') as Period;

  const since = getPeriodSince(period);
  const channelStats = voiceSessionRepository.getUserChannelStats(
    guildId,
    userId,
    since
  );

  if (channelStats.length === 0) {
    await interaction.reply({
      embeds: [
        createEmbed({
          title: t('notification.stats.title', locale),
          description: t('notification.stats.noData', locale),
          color: COLORS.INFO,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const totalMs = voiceSessionRepository.getUserTotalDuration(
    guildId,
    userId,
    since
  );

  const periodLabel = t(`notification.stats.periods.${period}`, locale);

  const lines = channelStats.map(
    (s) => `🔊 **${s.channel_name}** — ${formatDuration(s.total_duration_ms)}`
  );

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.stats.title', locale),
        description: lines.join('\n'),
        color: COLORS.INFO,
        fields: [
          {
            name: t('notification.stats.total', locale),
            value: formatDuration(totalMs),
            inline: true,
          },
          {
            name: t('notification.stats.period', locale),
            value: periodLabel,
            inline: true,
          },
        ],
        timestamp: true,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
