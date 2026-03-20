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
import { type Locale, t } from '../../../locales/index.js';
import {
  settingsRepository,
  auditRepository,
  type AuditLogRecord,
} from '../repositories/index.js';
import { logAuditAction } from '../../../services/audit/index.js';
import { formatAuditTarget } from '../../../services/audit/format.js';
import { getSendableTextChannel } from '../../../utils/discord.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';

type SettingsPanelView = 'overview' | 'language' | 'audit' | 'logs';

const PANEL_TIMEOUT = 120_000;
const LOGS_PAGE_SIZE = 10;

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
};

const SUPPORTED_LANGUAGES = ['ja', 'en'] as const;

function buildTabRow(
  locale: Locale,
  view: SettingsPanelView,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings-panel:overview')
      .setLabel(t('settings.overview', locale))
      .setStyle(
        view === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('settings-panel:language')
      .setLabel(t('settings.language.name', locale))
      .setStyle(
        view === 'language' ? ButtonStyle.Primary : ButtonStyle.Secondary
      )
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('settings-panel:audit')
      .setLabel(t('settings.audit.name', locale))
      .setStyle(view === 'audit' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('settings-panel:logs')
      .setLabel(t('settings.logs.title', locale))
      .setStyle(view === 'logs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function buildLanguageRow(
  locale: Locale,
  currentLanguage: string,
  disabled: boolean = false
): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('settings-panel:language-select')
      .setPlaceholder(t('settings.panel.languagePlaceholder', locale))
      .setDisabled(disabled)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('English')
          .setValue('en')
          .setDefault(currentLanguage === 'en'),
        new StringSelectMenuOptionBuilder()
          .setLabel('日本語')
          .setValue('ja')
          .setDefault(currentLanguage === 'ja')
      )
  );
}

function buildAuditSelectRow(
  locale: Locale,
  disabled: boolean = false
): ActionRowBuilder<ChannelSelectMenuBuilder> {
  return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('settings-panel:audit-channel')
      .setPlaceholder(t('settings.panel.auditPlaceholder', locale))
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
  );
}

function buildAuditActionsRow(
  locale: Locale,
  hasAuditChannel: boolean,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings-panel:audit-clear')
      .setLabel(t('settings.panel.clearAudit', locale))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled || !hasAuditChannel)
  );
}

function buildLogsPaginationRow(
  page: number,
  totalPages: number,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings-panel:logs-prev')
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('settings-panel:logs-page')
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('settings-panel:logs-next')
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1)
  );
}

function buildOverviewEmbed(guildId: string, locale: Locale) {
  const guildSettings = settingsRepository.getGuildSettings(guildId);
  const language = guildSettings?.language ?? 'ja';
  const languageDisplay = LANGUAGE_DISPLAY_NAMES[language] ?? language;
  const auditChannel = guildSettings?.audit_channel_id
    ? `<#${guildSettings.audit_channel_id}>`
    : t('settings.audit.notSet', locale);

  return createEmbed({
    title: t('settings.title', locale),
    color: COLORS.INFO,
    fields: [
      {
        name: t('settings.language.name', locale),
        value: languageDisplay,
        inline: true,
      },
      {
        name: t('settings.audit.name', locale),
        value: auditChannel,
        inline: true,
      },
    ],
    footer: t('settings.panel.overviewFooter', locale),
  });
}

function buildLanguageEmbed(guildId: string, locale: Locale) {
  const language = settingsRepository.getGuildSettings(guildId)?.language ?? 'ja';
  const languageDisplay = LANGUAGE_DISPLAY_NAMES[language] ?? language;

  return createEmbed({
    title: t('settings.language.name', locale),
    description: `${t('settings.language.current', locale)}: **${languageDisplay}**`,
    color: COLORS.INFO,
    footer: t('settings.panel.languageFooter', locale),
  });
}

function buildAuditEmbed(guildId: string, locale: Locale) {
  const auditChannel = settingsRepository.getGuildSettings(guildId)?.audit_channel_id;

  return createEmbed({
    title: t('settings.audit.name', locale),
    description: auditChannel
      ? `<#${auditChannel}>`
      : t('settings.audit.notSet', locale),
    color: COLORS.INFO,
    footer: t('settings.panel.auditFooter', locale),
  });
}

function formatLog(log: AuditLogRecord): string {
  const timestamp = Math.floor(log.created_at / 1000);
  const action = log.action.replace('_', ' ');
  const targetDisplay = formatAuditTarget(log.action, log.target_id);
  const target = targetDisplay ? ` → ${targetDisplay}` : '';
  return `<t:${timestamp}:R> <@${log.user_id}> **${action}**${target}`;
}

function buildLogsEmbed(
  guildId: string,
  locale: Locale,
  page: number
): {
  embed: ReturnType<typeof createEmbed>;
  totalPages: number;
  totalLogs: number;
} {
  const logs = auditRepository.getLogs(guildId, 50);
  const totalCount = auditRepository.getLogsCount(guildId);

  if (logs.length === 0) {
    return {
      embed: createEmbed({
        title: t('settings.logs.title', locale),
        description: t('settings.logs.noLogs', locale),
        color: COLORS.INFO,
      }),
      totalPages: 1,
      totalLogs: 0,
    };
  }

  const totalPages = Math.max(1, Math.ceil(logs.length / LOGS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageLogs = logs.slice(
    safePage * LOGS_PAGE_SIZE,
    (safePage + 1) * LOGS_PAGE_SIZE
  );

  return {
    embed: createEmbed({
      title: t('settings.logs.title', locale),
      description: pageLogs.map(formatLog).join('\n'),
      color: COLORS.INFO,
      footer: `${t('settings.logs.showing', locale, {
        count: logs.length,
        total: totalCount,
      })} | ${safePage + 1}/${totalPages}`,
    }),
    totalPages,
    totalLogs: logs.length,
  };
}

function buildComponents(
  guildId: string,
  locale: Locale,
  view: SettingsPanelView,
  logsPage: number,
  disabled: boolean = false
) {
  const rows: ActionRowBuilder<
    ButtonBuilder | StringSelectMenuBuilder | ChannelSelectMenuBuilder
  >[] = [buildTabRow(locale, view, disabled)];

  if (view === 'language') {
    const currentLanguage =
      settingsRepository.getGuildSettings(guildId)?.language ?? 'ja';
    rows.push(buildLanguageRow(locale, currentLanguage, disabled));
  }

  if (view === 'audit') {
    const hasAuditChannel = !!settingsRepository.getGuildSettings(guildId)
      ?.audit_channel_id;
    rows.push(buildAuditSelectRow(locale, disabled));
    rows.push(buildAuditActionsRow(locale, hasAuditChannel, disabled));
  }

  if (view === 'logs') {
    const { totalPages, totalLogs } = buildLogsEmbed(guildId, locale, logsPage);
    if (totalLogs > 0) {
      rows.push(buildLogsPaginationRow(logsPage, totalPages, disabled));
    }
  }

  return rows;
}

export async function showSettingsPanel(
  interaction: ChatInputCommandInteraction,
  locale: Locale,
  initialView: SettingsPanelView = 'overview'
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

  let currentView = initialView;
  let logsPage = 0;

  const render = () => {
    if (currentView === 'overview') {
      return {
        embed: buildOverviewEmbed(interaction.guildId!, locale),
        components: buildComponents(
          interaction.guildId!,
          locale,
          currentView,
          logsPage
        ),
      };
    }

    if (currentView === 'language') {
      return {
        embed: buildLanguageEmbed(interaction.guildId!, locale),
        components: buildComponents(
          interaction.guildId!,
          locale,
          currentView,
          logsPage
        ),
      };
    }

    if (currentView === 'audit') {
      return {
        embed: buildAuditEmbed(interaction.guildId!, locale),
        components: buildComponents(
          interaction.guildId!,
          locale,
          currentView,
          logsPage
        ),
      };
    }

    const logsState = buildLogsEmbed(interaction.guildId!, locale, logsPage);
    const totalPages = Math.max(1, logsState.totalPages);
    logsPage = Math.min(logsPage, totalPages - 1);

    return {
      embed: buildLogsEmbed(interaction.guildId!, locale, logsPage).embed,
      components: buildComponents(
        interaction.guildId!,
        locale,
        currentView,
        logsPage
      ),
    };
  };

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
        if (
          componentInteraction.customId === 'settings-panel:overview' ||
          componentInteraction.customId === 'settings-panel:language' ||
          componentInteraction.customId === 'settings-panel:audit' ||
          componentInteraction.customId === 'settings-panel:logs'
        ) {
          currentView = componentInteraction.customId.replace(
            'settings-panel:',
            ''
          ) as SettingsPanelView;
          if (currentView !== 'logs') {
            logsPage = 0;
          }
        }

        if (
          currentView === 'logs' &&
          componentInteraction.customId === 'settings-panel:logs-prev'
        ) {
          logsPage = Math.max(0, logsPage - 1);
        }

        if (
          currentView === 'logs' &&
          componentInteraction.customId === 'settings-panel:logs-next'
        ) {
          logsPage++;
        }

        if (componentInteraction.customId === 'settings-panel:audit-clear') {
          settingsRepository.setAuditChannel(interaction.guildId!, null);
          await logAuditAction(
            interaction.client,
            interaction.guildId!,
            interaction.user.id,
            'AUDIT_SETUP',
            undefined,
            'Audit channel disabled from settings panel'
          );
          currentView = 'audit';
        }
      }

      if (componentInteraction.isStringSelectMenu()) {
        const value = componentInteraction.values[0];
        if (
          componentInteraction.customId === 'settings-panel:language-select' &&
          value &&
          SUPPORTED_LANGUAGES.includes(
            value as (typeof SUPPORTED_LANGUAGES)[number]
          )
        ) {
          settingsRepository.setGuildSettings(interaction.guildId!, {
            language: value,
          });
          await logAuditAction(
            componentInteraction.client,
            componentInteraction.guildId!,
            componentInteraction.user.id,
            'SETTINGS_CHANGE',
            undefined,
            `Language changed to: ${value}`
          );
          currentView = 'language';
        }
      }

      if (componentInteraction.isChannelSelectMenu()) {
        const channelId = componentInteraction.values[0];
        const channel = await getSendableTextChannel(
          interaction.guild!,
          channelId
        );
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

        settingsRepository.setAuditChannel(interaction.guildId!, channelId);
        await logAuditAction(
          interaction.client,
          interaction.guildId!,
          interaction.user.id,
          'AUDIT_SETUP',
          channelId,
          `Audit channel set to: #${channel.name}`
        );
        currentView = 'audit';
      }

      const nextState = render();
      await componentInteraction.update({
        embeds: [nextState.embed],
        components: nextState.components,
      });
    } catch (error) {
      logger.warn(`Failed to update settings panel: ${getErrorMessage(error)}`);
      await componentInteraction.deferUpdate().catch(() => undefined);
    }
  });

  collector.on('end', async () => {
    await interaction
      .editReply({
        components: buildComponents(
          interaction.guildId!,
          locale,
          currentView,
          logsPage,
          true
        ),
      })
      .catch((error: unknown) => {
        logger.debug(
          `Failed to disable settings panel components: ${getErrorMessage(error)}`
        );
      });
  });
}
