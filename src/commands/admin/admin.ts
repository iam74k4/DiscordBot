import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';
import { isBotOwner } from '../../config/env.js';
import {
  getRegisteredUsersCount,
  database,
} from '../../services/database/index.js';

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
 * Handle db subcommand
 */
async function handleDb(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const registeredUsers = getRegisteredUsersCount();

  // Get table counts
  const tables = [
    'steam_users',
    'playtime_history',
    'notification_settings',
    'user_notification_prefs',
    'game_activity_cache',
    'guild_settings',
    'audit_logs',
  ];

  const tableCounts: { name: string; count: number }[] = [];

  for (const table of tables) {
    try {
      const stmt = database.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get() as { count: number } | undefined;
      if (result) {
        tableCounts.push({ name: table, count: result.count });
      }
    } catch {
      // Table doesn't exist yet
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

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot administration commands (owner only)')
    .addSubcommand((sub) =>
      sub.setName('stats').setDescription('View bot statistics')
    )
    .addSubcommand((sub) =>
      sub.setName('db').setDescription('View database statistics')
    )
    .addSubcommand((sub) =>
      sub.setName('guilds').setDescription('List servers the bot is in')
    )
    .addSubcommand((sub) =>
      sub
        .setName('broadcast')
        .setDescription('Send a message to all server owners')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message to broadcast')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Check if user is bot owner
    if (!checkOwner(interaction)) {
      const errorEmbed = createErrorEmbed(
        'Access Denied',
        'This command is only available to bot owners.'
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
    }
  },
};

export default command;

