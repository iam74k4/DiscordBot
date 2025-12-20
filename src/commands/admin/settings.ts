import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/index.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';
import {
  getGuildSettings,
  setAuditChannel,
  getAuditLogs,
  getAuditLogsCount,
  AuditLogRecord,
} from '../../services/database/settings.js';
import { logAuditAction } from '../../services/audit/index.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

/**
 * Handle view subcommand
 */
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

  const guildSettings = getGuildSettings(interaction.guild.id);

  const auditChannel = guildSettings?.audit_channel_id
    ? `<#${guildSettings.audit_channel_id}>`
    : t('settings.audit.notSet', locale);

  const embed = createEmbed({
    title: t('settings.title', locale),
    color: COLORS.INFO,
    fields: [
      { name: t('settings.audit.name', locale), value: auditChannel, inline: true },
    ],
    footer: t('settings.view.footer', locale),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle audit subcommand
 */
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
    setAuditChannel(interaction.guild.id, channel.id);

    await logAuditAction(
      interaction.client,
      interaction.guild.id,
      interaction.user.id,
      'AUDIT_SETUP',
      channel.id,
      `Audit channel set to: #${channel.name}`
    );

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.configured', locale, { channel: channel.id }),
      color: COLORS.SUCCESS,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });
  } else {
    // Remove audit channel
    setAuditChannel(interaction.guild.id, null);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.disabled', locale),
      color: COLORS.WARNING,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });
  }
}

/**
 * Handle logs subcommand
 */
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

  const logs = getAuditLogs(interaction.guild.id, 20);
  const totalCount = getAuditLogsCount(interaction.guild.id);

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
    const target = log.target_id ? ` → <@${log.target_id}>` : '';
    return `<t:${timestamp}:R> <@${log.user_id}> **${action}**${target}`;
  };

  const logList = logs.map(formatLog).join('\n');

  const embed = createEmbed({
    title: t('settings.logs.title', locale),
    description: logList,
    color: COLORS.INFO,
    footer: t('settings.logs.showing', locale, { count: logs.length, total: totalCount }),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Server settings management')
    .setDescriptionLocalizations({
      ja: 'サーバー設定の管理',
    })
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View current settings')
        .setDescriptionLocalizations({
          ja: '現在の設定を表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('audit')
        .setDescription('Set audit log channel')
        .setDescriptionLocalizations({
          ja: '監査ログチャンネルを設定',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for audit logs (leave empty to disable)')
            .setDescriptionLocalizations({
              ja: '監査ログを送信するチャンネル（空で無効化）',
            })
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('logs')
        .setDescription('View recent audit logs')
        .setDescriptionLocalizations({
          ja: '最近の監査ログを表示',
        })
    ),

  async execute(interaction) {
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
    }
  },
};

export default command;
