import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants/index.js';
import { isBotOwner } from '../../config/env.js';
import {
  getRegisteredUsersCount,
  getTableRowCount,
} from '../../services/database/index.js';
import { t, mapDiscordLocale } from '../../locales/index.js';
import { getHealthStatus, formatHealthStatus } from '../../services/health/index.js';
import { backupService } from '../../services/backup/index.js';
import { metrics } from '../../services/metrics/index.js';

/**
 * Check if user is bot owner
 */
function checkOwner(interaction: ChatInputCommandInteraction): boolean {
  if (!isBotOwner(interaction.user.id)) {
    return false;
  }
  return true;
}

/**
 * Handle stats subcommand
 */
async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const client = interaction.client;

  const guildCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce(
    (acc, guild) => acc + guild.memberCount,
    0
  );
  const channelCount = client.channels.cache.size;

  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${days}d ${hours}h ${minutes}m`;

  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

  const embed = createEmbed({
    title: 'Bot Statistics',
    color: COLORS.INFO,
    fields: [
      { name: 'Servers', value: guildCount.toLocaleString(), inline: true },
      { name: 'Users', value: userCount.toLocaleString(), inline: true },
      { name: 'Channels', value: channelCount.toLocaleString(), inline: true },
      { name: 'Uptime', value: uptimeStr, inline: true },
      { name: 'Memory', value: `${memoryMB} MB`, inline: true },
      { name: 'Node.js', value: process.version, inline: true },
    ],
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Table names to display in database stats
 */
const DB_STATS_TABLES = [
  'steam_users',
  'playtime_history',
  'notification_settings',
  'user_notification_prefs',
  'game_activity_cache',
  'guild_settings',
  'audit_logs',
];

/**
 * Handle db subcommand
 */
async function handleDb(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const registeredUsers = getRegisteredUsersCount();

  const tableCounts: { name: string; count: number }[] = [];

  for (const table of DB_STATS_TABLES) {
    const count = getTableRowCount(table);
    if (count !== null) {
      tableCounts.push({ name: table, count });
    }
  }

  const tableList =
    tableCounts.length > 0
      ? tableCounts.map((t) => `\`${t.name}\`: ${t.count}`).join('\n')
      : 'No tables found';

  const embed = createEmbed({
    title: 'Database Statistics',
    color: COLORS.INFO,
    fields: [
      {
        name: 'Registered Users',
        value: registeredUsers.toLocaleString(),
        inline: true,
      },
      { name: 'Tables', value: tableList, inline: false },
    ],
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handle guilds subcommand
 */
async function handleGuilds(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const client = interaction.client;
  const guilds = client.guilds.cache
    .sort((a, b) => b.memberCount - a.memberCount)
    .first(20);

  const guildList = guilds
    .map(
      (guild, index) =>
        `${index + 1}. **${guild.name}** (${guild.memberCount.toLocaleString()} members)`
    )
    .join('\n');

  const embed = createEmbed({
    title: `Server List (Top 20 of ${client.guilds.cache.size})`,
    description: guildList || 'No servers',
    color: COLORS.INFO,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handle broadcast subcommand (send message to all server owners)
 */
async function handleBroadcast(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const message = interaction.options.getString('message', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const client = interaction.client;
  let sent = 0;
  let failed = 0;

  const embed = new EmbedBuilder()
    .setTitle('Announcement from Bot Owner')
    .setDescription(message)
    .setColor(COLORS.INFO)
    .setTimestamp();

  for (const guild of client.guilds.cache.values()) {
    try {
      const owner = await guild.fetchOwner();
      await owner.send({ embeds: [embed] });
      sent++;
    } catch {
      failed++;
    }
  }

  const resultEmbed = createEmbed({
    title: 'Broadcast Complete',
    description: `Sent: ${sent}\nFailed: ${failed}`,
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [resultEmbed] });
}

/**
 * Handle health subcommand
 */
async function handleHealth(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const health = getHealthStatus(interaction.client);
  const formatted = formatHealthStatus(health);

  const statusColor =
    health.status === 'healthy'
      ? COLORS.SUCCESS
      : health.status === 'degraded'
        ? COLORS.WARNING
        : COLORS.ERROR;

  const embed = createEmbed({
    title: 'System Health Check',
    description: formatted,
    color: statusColor,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handle backup list subcommand
 */
async function handleBackupList(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const backupList = backupService.formatBackupList();

  const embed = createEmbed({
    title: 'Database Backups',
    description: backupList,
    color: COLORS.INFO,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Handle backup run subcommand
 */
async function handleBackupRun(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await backupService.runBackup();

  if (result.success) {
    const embed = createEmbed({
      title: 'Backup Complete',
      description: `Backup created successfully.\n\n**Filename:** \`${result.filename}\`\n**Size:** ${Math.round(result.size / 1024)} KB`,
      color: COLORS.SUCCESS,
      timestamp: true,
    });
    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = createErrorEmbed(
      'Backup Failed',
      result.error || 'Unknown error occurred'
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * Handle metrics subcommand
 */
async function handleMetrics(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const formatted = metrics.formatForDisplay();

  const embed = createEmbed({
    title: 'Bot Metrics',
    description: formatted,
    color: COLORS.INFO,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot administration commands (owner only)')
    .setDescriptionLocalizations({
      ja: 'Bot管理コマンド（オーナー専用）',
    })
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription('View bot statistics')
        .setDescriptionLocalizations({
          ja: 'Bot統計を表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('db')
        .setDescription('View database statistics')
        .setDescriptionLocalizations({
          ja: 'データベース統計を表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('guilds')
        .setDescription('List servers the bot is in')
        .setDescriptionLocalizations({
          ja: 'Botが参加しているサーバー一覧',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('broadcast')
        .setDescription('Send a message to all server owners')
        .setDescriptionLocalizations({
          ja: '全サーバーオーナーにメッセージを送信',
        })
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message to broadcast')
            .setDescriptionLocalizations({
              ja: '送信するメッセージ',
            })
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('health')
        .setDescription('View system health status')
        .setDescriptionLocalizations({
          ja: 'システムヘルスステータスを表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('backup-list')
        .setDescription('List database backups')
        .setDescriptionLocalizations({
          ja: 'データベースバックアップ一覧',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('backup-run')
        .setDescription('Run a manual database backup')
        .setDescriptionLocalizations({
          ja: '手動でデータベースバックアップを実行',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('metrics')
        .setDescription('View bot usage metrics')
        .setDescriptionLocalizations({
          ja: 'Bot使用メトリクスを表示',
        })
    ),

  async execute(interaction) {
    const locale = mapDiscordLocale(interaction.locale);

    // Check if user is bot owner
    if (!checkOwner(interaction)) {
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
      case 'stats':
        await handleStats(interaction);
        break;
      case 'db':
        await handleDb(interaction);
        break;
      case 'guilds':
        await handleGuilds(interaction);
        break;
      case 'broadcast':
        await handleBroadcast(interaction);
        break;
      case 'health':
        await handleHealth(interaction);
        break;
      case 'backup-list':
        await handleBackupList(interaction);
        break;
      case 'backup-run':
        await handleBackupRun(interaction);
        break;
      case 'metrics':
        await handleMetrics(interaction);
        break;
    }
  },
};

export default command;
