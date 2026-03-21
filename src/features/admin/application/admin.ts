import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { isBotOwner } from '../../../config/env.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { withTimeout } from '../../../shared/utils/timeout.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { backupService } from '../../../infrastructure/backup/index.js';
import { showAdminSystemPanel } from './systemPanel.js';

function checkOwner(interaction: ChatInputCommandInteraction): boolean {
  return isBotOwner(interaction.user.id);
}

async function handleStats(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'stats');
}

async function handleDb(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'db');
}

async function handleGuilds(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'guilds');
}

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

  const BROADCAST_TIMEOUT = 5_000;

  for (const guild of client.guilds.cache.values()) {
    try {
      const owner = await withTimeout(guild.fetchOwner(), BROADCAST_TIMEOUT);
      await withTimeout(owner.send({ embeds: [embed] }), BROADCAST_TIMEOUT);
      sent++;
    } catch (error) {
      failed++;
      logger.debug(
        `Failed to send broadcast to guild ${guild.id}:`,
        getErrorMessage(error)
      );
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

async function handleHealth(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'health');
}

async function handleBackupList(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'backups');
}

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

async function handleMetrics(
  interaction: ChatInputCommandInteraction,
  locale: ReturnType<typeof mapDiscordLocale>
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'metrics');
}

export async function executeAdminCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

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

  const group = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (group === 'backup') {
    switch (subcommand) {
      case 'list':
        await handleBackupList(interaction, locale);
        break;
      case 'run':
        await handleBackupRun(interaction);
        break;
    }
    return;
  }

  switch (subcommand) {
    case 'stats':
      await handleStats(interaction, locale);
      break;
    case 'db':
      await handleDb(interaction, locale);
      break;
    case 'guilds':
      await handleGuilds(interaction, locale);
      break;
    case 'broadcast':
      await handleBroadcast(interaction);
      break;
    case 'health':
      await handleHealth(interaction, locale);
      break;
    case 'metrics':
      await handleMetrics(interaction, locale);
      break;
  }
}
