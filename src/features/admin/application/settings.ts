import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import {
  settingsRepository,
  auditRepository,
  type AuditLogRecord,
} from '../repositories/index.js';
import { logAuditAction } from '../../../services/audit/index.js';
import { formatAuditTarget } from '../../../services/audit/format.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

async function handleView(
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

  const guildSettings = settingsRepository.getGuildSettings(
    interaction.guild.id
  );

  const language = guildSettings?.language ?? 'ja';
  const languageDisplay = language === 'ja' ? '日本語' : 'English';

  const auditChannel = guildSettings?.audit_channel_id
    ? `<#${guildSettings.audit_channel_id}>`
    : t('settings.audit.notSet', locale);

  const embed = createEmbed({
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
    footer: t('settings.view.footer', locale),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleAudit(
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

  const channel = interaction.options.getChannel('channel');

  if (channel) {
    settingsRepository.setAuditChannel(interaction.guild.id, channel.id);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.configured', locale, {
        channel: channel.id,
      }),
      color: COLORS.SUCCESS,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });

    void logAuditAction(
      interaction.client,
      interaction.guild.id,
      interaction.user.id,
      'AUDIT_SETUP',
      channel.id,
      `Audit channel set to: #${channel.name}`
    );
  } else {
    settingsRepository.setAuditChannel(interaction.guild.id, null);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.disabled', locale),
      color: COLORS.WARNING,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });
  }
}

async function handleLogs(
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

  const logs = auditRepository.getLogs(interaction.guild.id, 20);
  const totalCount = auditRepository.getLogsCount(interaction.guild.id);

  if (logs.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('settings.logs.noLogs', locale)
    );
    await interaction.reply({ embeds: [warningEmbed] });
    return;
  }

  const formatLog = (log: AuditLogRecord): string => {
    const timestamp = Math.floor(log.created_at / 1000);
    const action = log.action.replace('_', ' ');
    const targetDisplay = formatAuditTarget(log.action, log.target_id);
    const target = targetDisplay ? ` → ${targetDisplay}` : '';
    return `<t:${timestamp}:R> <@${log.user_id}> **${action}**${target}`;
  };

  const logList = logs.map(formatLog).join('\n');

  const embed = createEmbed({
    title: t('settings.logs.title', locale),
    description: logList,
    color: COLORS.INFO,
    footer: t('settings.logs.showing', locale, {
      count: logs.length,
      total: totalCount,
    }),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleLanguage(
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

  const lang = interaction.options.getString('lang', true);

  settingsRepository.setGuildSettings(interaction.guild.id, { language: lang });

  const languageDisplay = lang === 'ja' ? '日本語' : 'English';

  const embed = createEmbed({
    title: t('settings.language.name', locale),
    description: t('settings.language.changed', locale, {
      language: languageDisplay,
    }),
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });

  void logAuditAction(
    interaction.client,
    interaction.guild.id,
    interaction.user.id,
    'SETTINGS_CHANGE',
    undefined,
    `Language changed to: ${lang}`
  );
}

export async function executeSettingsCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const memberPermissions = interaction.member?.permissions;
  const hasManageGuild =
    memberPermissions instanceof PermissionsBitField &&
    memberPermissions.has(PermissionFlagsBits.ManageGuild);

  if (!interaction.guild || !hasManageGuild) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.noPermission', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      await handleView(interaction);
      break;
    case 'audit':
      await handleAudit(interaction);
      break;
    case 'logs':
      await handleLogs(interaction);
      break;
    case 'language':
      await handleLanguage(interaction);
      break;
  }
}
