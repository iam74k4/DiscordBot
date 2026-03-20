import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, type Locale } from '../../../locales/index.js';
import {
  notificationChannelRepository,
  type NotificationType,
} from '../repositories/notificationChannelRepository.js';
import { voiceSessionRepository } from '../repositories/voiceSessionRepository.js';
import {
  getSendableTextChannel,
  interactionHasGuildPermission,
} from '../../../utils/discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';

type NotificationPanelView = 'status' | 'stats';
type Period = 'today' | 'week' | 'month' | 'all';

const PANEL_TIMEOUT = 120_000;

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

function buildNavigationRow(
  locale: Locale,
  view: NotificationPanelView,
  canManageGuild: boolean,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('notification-panel:stats')
      .setLabel(t('notification.panel.statsTab', locale))
      .setStyle(view === 'stats' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled)
  );

  if (canManageGuild) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('notification-panel:status')
        .setLabel(t('notification.panel.statusTab', locale))
        .setStyle(
          view === 'status' ? ButtonStyle.Primary : ButtonStyle.Secondary
        )
        .setDisabled(disabled)
    );
  }

  return row;
}

function buildStatsPeriodRow(
  locale: Locale,
  period: Period,
  disabled: boolean = false
): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('notification-panel:stats-period')
      .setPlaceholder(t('notification.panel.periodPlaceholder', locale))
      .setDisabled(disabled)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(t('notification.stats.periods.today', locale))
          .setValue('today')
          .setDefault(period === 'today'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('notification.stats.periods.week', locale))
          .setValue('week')
          .setDefault(period === 'week'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('notification.stats.periods.month', locale))
          .setValue('month')
          .setDefault(period === 'month'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('notification.stats.periods.all', locale))
          .setValue('all')
          .setDefault(period === 'all')
      )
  );
}

function buildChannelSelectRow(
  locale: Locale,
  type: NotificationType,
  disabled: boolean = false
): ActionRowBuilder<ChannelSelectMenuBuilder> {
  const placeholder =
    type === 'voice'
      ? t('notification.panel.voicePlaceholder', locale)
      : t('notification.panel.welcomePlaceholder', locale);

  return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`notification-panel:${type}:channel`)
      .setPlaceholder(placeholder)
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
  );
}

function buildRemovalRow(
  locale: Locale,
  records: ReturnType<typeof notificationChannelRepository.getAllForGuild>,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  const hasVoice = records.some((record) => record.type === 'voice');
  const hasWelcome = records.some((record) => record.type === 'member_join');

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('notification-panel:voice:remove')
      .setLabel(t('notification.panel.removeVoice', locale))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled || !hasVoice),
    new ButtonBuilder()
      .setCustomId('notification-panel:member_join:remove')
      .setLabel(t('notification.panel.removeWelcome', locale))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled || !hasWelcome)
  );
}

function buildStatusEmbed(guildId: string, locale: Locale) {
  const records = notificationChannelRepository.getAllForGuild(guildId);
  const typeLabels: Record<NotificationType, string> = {
    voice: t('notification.status.voiceLabel', locale),
    member_join: t('notification.status.welcomeLabel', locale),
  };

  const fields = (['voice', 'member_join'] as NotificationType[]).map((type) => {
    const record = records.find((item) => item.type === type);
    return {
      name: typeLabels[type],
      value: record?.enabled
        ? `<#${record.channel_id}>`
        : t('notification.status.disabled', locale),
      inline: true,
    };
  });

  return createEmbed({
    title: t('notification.status.title', locale),
    description: t('notification.panel.statusDescription', locale),
    color: COLORS.INFO,
    fields,
    timestamp: true,
  });
}

function buildStatsEmbed(
  guildId: string,
  userId: string,
  period: Period,
  locale: Locale
) {
  const since = getPeriodSince(period);
  const channelStats = voiceSessionRepository.getUserChannelStats(
    guildId,
    userId,
    since
  );

  if (channelStats.length === 0) {
    return createEmbed({
      title: t('notification.stats.title', locale),
      description: t('notification.stats.noData', locale),
      color: COLORS.INFO,
      fields: [
        {
          name: t('notification.stats.period', locale),
          value: t(`notification.stats.periods.${period}`, locale),
          inline: true,
        },
      ],
      timestamp: true,
    });
  }

  const totalMs = voiceSessionRepository.getUserTotalDuration(
    guildId,
    userId,
    since
  );

  return createEmbed({
    title: t('notification.stats.title', locale),
    description: channelStats
      .map((stat) => `🔊 **${stat.channel_name}** — ${formatDuration(stat.total_duration_ms)}`)
      .join('\n'),
    color: COLORS.INFO,
    fields: [
      {
        name: t('notification.stats.total', locale),
        value: formatDuration(totalMs),
        inline: true,
      },
      {
        name: t('notification.stats.period', locale),
        value: t(`notification.stats.periods.${period}`, locale),
        inline: true,
      },
    ],
    timestamp: true,
  });
}

function buildComponents(
  locale: Locale,
  guildId: string,
  view: NotificationPanelView,
  period: Period,
  canManageGuild: boolean,
  disabled: boolean = false
) {
  const rows: ActionRowBuilder<
    ButtonBuilder | StringSelectMenuBuilder | ChannelSelectMenuBuilder
  >[] = [
    buildNavigationRow(locale, view, canManageGuild, disabled),
  ];

  if (view === 'stats') {
    rows.push(buildStatsPeriodRow(locale, period, disabled));
    return rows;
  }

  if (!canManageGuild) {
    return rows;
  }

  const records = notificationChannelRepository.getAllForGuild(guildId);
  rows.push(buildChannelSelectRow(locale, 'voice', disabled));
  rows.push(buildChannelSelectRow(locale, 'member_join', disabled));
  rows.push(buildRemovalRow(locale, records, disabled));
  return rows;
}

export async function showNotificationPanel(
  interaction: ChatInputCommandInteraction,
  locale: Locale,
  options?: {
    initialView?: NotificationPanelView;
    initialPeriod?: Period;
  }
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(t('common.error', locale), t('common.guildOnly', locale)),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const canManageGuild = interactionHasGuildPermission(
    interaction,
    PermissionFlagsBits.ManageGuild
  );
  let currentView: NotificationPanelView =
    options?.initialView === 'status' && canManageGuild ? 'status' : 'stats';
  let currentPeriod = options?.initialPeriod ?? 'all';

  const render = () => ({
    embed:
      currentView === 'status'
        ? buildStatusEmbed(interaction.guildId!, locale)
        : buildStatsEmbed(
            interaction.guildId!,
            interaction.user.id,
            currentPeriod,
            locale
          ),
    components: buildComponents(
      locale,
      interaction.guildId!,
      currentView,
      currentPeriod,
      canManageGuild
    ),
  });

  const initialState = render();
  const response = await interaction.reply({
    embeds: [initialState.embed],
    components: initialState.components,
    flags: MessageFlags.Ephemeral,
    fetchReply: true,
  });

  if (typeof response.createMessageComponentCollector !== 'function') {
    return;
  }

  const collector = response.createMessageComponentCollector({
    time: PANEL_TIMEOUT,
  });

  collector.on('collect', async (componentInteraction) => {
    if (componentInteraction.user.id !== interaction.user.id) {
      await componentInteraction.reply({
        content: t('help.onlyCommandUser', locale),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      if (componentInteraction.isButton()) {
        if (componentInteraction.customId === 'notification-panel:stats') {
          currentView = 'stats';
        }

        if (
          canManageGuild &&
          componentInteraction.customId === 'notification-panel:status'
        ) {
          currentView = 'status';
        }

        if (
          canManageGuild &&
          componentInteraction.customId === 'notification-panel:voice:remove'
        ) {
          notificationChannelRepository.remove(interaction.guildId!, 'voice');
          currentView = 'status';
        }

        if (
          canManageGuild &&
          componentInteraction.customId ===
            'notification-panel:member_join:remove'
        ) {
          notificationChannelRepository.remove(
            interaction.guildId!,
            'member_join'
          );
          currentView = 'status';
        }
      }

      if (componentInteraction.isStringSelectMenu()) {
        currentView = 'stats';
        currentPeriod = componentInteraction.values[0] as Period;
      }

      if (canManageGuild && componentInteraction.isChannelSelectMenu()) {
        const type = componentInteraction.customId.includes('voice')
          ? 'voice'
          : 'member_join';
        const channelId = componentInteraction.values[0];
        const channel = await getSendableTextChannel(interaction.guild!, channelId);

        if (!channel) {
          await componentInteraction.reply({
            embeds: [
              createErrorEmbed(
                t('common.error', locale),
                t('notification.errors.channelNotSendable', locale)
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        notificationChannelRepository.set(interaction.guildId!, type, channelId);
        currentView = 'status';
      }

      const nextState = render();
      await componentInteraction.update({
        embeds: [nextState.embed],
        components: nextState.components,
      });
    } catch (error) {
      logger.warn(
        `Failed to update notification panel: ${getErrorMessage(error)}`
      );
      await componentInteraction.deferUpdate().catch(() => undefined);
    }
  });

  collector.on('end', async () => {
    await interaction
      .editReply({
        components: buildComponents(
          locale,
          interaction.guildId!,
          currentView,
          currentPeriod,
          canManageGuild,
          true
        ),
      })
      .catch((error: unknown) => {
        logger.debug(
          `Failed to disable notification panel components: ${getErrorMessage(error)}`
        );
      });
  });
}
