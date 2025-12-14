import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
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
  setGuildSettings,
  setAuditChannel,
  getAuditLogs,
  getAuditLogsCount,
  AuditLogRecord,
} from '../../services/database/settings.js';
import { logAuditAction } from '../../services/audit/index.js';

/**
 * Handle view subcommand
 */
async function handleView(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      'Error',
      'This command can only be used in a server.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);

  const language = settings?.language ?? 'ja';
  const auditChannel = settings?.audit_channel_id
    ? `<#${settings.audit_channel_id}>`
    : 'Not set';

  const embed = createEmbed({
    title: 'Server Settings',
    color: COLORS.INFO,
    fields: [
      {
        name: 'Language',
        value: language === 'ja' ? 'Japanese' : 'English',
        inline: true,
      },
      { name: 'Audit Channel', value: auditChannel, inline: true },
    ],
    footer: 'Use /settings to modify',
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle language subcommand
 */
async function handleLanguage(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      'Error',
      'This command can only be used in a server.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const language = interaction.options.getString('language', true);

  setGuildSettings(interaction.guild.id, { language });

  await logAuditAction(
    interaction.client,
    interaction.guild.id,
    interaction.user.id,
    'SETTINGS_CHANGE',
    undefined,
    `Language changed to: ${language}`
  );

  const embed = createEmbed({
    title: 'Settings Updated',
    description: `Language set to: **${language === 'ja' ? 'Japanese' : 'English'}**`,
    color: COLORS.SUCCESS,
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
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      'Error',
      'This command can only be used in a server.'
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
      title: 'Audit Log Configured',
      description: `Audit logs will be sent to <#${channel.id}>`,
      color: COLORS.SUCCESS,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });
  } else {
    // Remove audit channel
    setAuditChannel(interaction.guild.id, null);

    const embed = createEmbed({
      title: 'Audit Log Disabled',
      description: 'Audit log channel has been removed.',
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
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      'Error',
      'This command can only be used in a server.'
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
      'No Logs',
      'No audit logs found for this server.'
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
    title: 'Audit Logs',
    description: logList,
    color: COLORS.INFO,
    footer: `Showing ${logs.length} of ${totalCount} logs`,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Server settings management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View current settings')
    )
    .addSubcommand((sub) =>
      sub
        .setName('language')
        .setDescription('Set server language')
        .addStringOption((opt) =>
          opt
            .setName('language')
            .setDescription('Language to use')
            .setRequired(true)
            .addChoices(
              { name: 'Japanese', value: 'ja' },
              { name: 'English', value: 'en' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('audit')
        .setDescription('Set audit log channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for audit logs (leave empty to disable)')
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('logs').setDescription('View recent audit logs')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'view':
        await handleView(interaction);
        break;
      case 'language':
        await handleLanguage(interaction);
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
