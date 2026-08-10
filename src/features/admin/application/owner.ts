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
import { t, type Locale } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { backupService } from '../../../infrastructure/backup/index.js';
import { guildSettingsRepository } from '../../../infrastructure/guildSettings/index.js';
import { getSendableTextChannel } from '../../../shared/utils/discord.js';
import { showAdminSystemPanel } from './systemPanel.js';
import { awaitConfirmation } from '../../../shared/utils/confirm.js';

/** Limit broadcast fan-out per invocation (rate limits / UX). */
const BROADCAST_MAX_GUILDS = 250;
/** Update ephemeral progress text every N guilds. */
const BROADCAST_PROGRESS_EVERY = 12;

function checkOwner(interaction: ChatInputCommandInteraction): boolean {
  return isBotOwner(interaction.user.id);
}

export interface BroadcastTarget<G> {
  guild: G;
  channelId: string;
}

export interface BroadcastPlan<G> {
  /** Guilds this run will actually post to, already capped. */
  targets: BroadcastTarget<G>[];
  /** Guilds with no announcement channel. Not failures - they never opted in. */
  skipped: number;
  /** Addressable guilds left out because the run hit `BROADCAST_MAX_GUILDS`. */
  overCap: number;
}

/**
 * Decide who a broadcast goes to.
 *
 * Split out from the send loop because the interesting rule is here: a guild
 * that never nominated a channel is skipped rather than counted as a delivery
 * failure, so an owner reading the result can tell "nobody opted in" apart
 * from "delivery is broken".
 */
export function planBroadcast<G extends { id: string }>(
  guilds: readonly G[],
  announcementChannelOf: (guildId: string) => string | null,
  cap = BROADCAST_MAX_GUILDS
): BroadcastPlan<G> {
  const addressable = guilds.flatMap((guild) => {
    const channelId = announcementChannelOf(guild.id);
    return channelId ? [{ guild, channelId }] : [];
  });

  return {
    targets: addressable.slice(0, cap),
    skipped: guilds.length - addressable.length,
    overCap: Math.max(0, addressable.length - cap),
  };
}

async function handleStats(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'stats');
}

async function handleDb(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'db');
}

async function handleGuilds(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'guilds');
}

async function handleBroadcast(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  const message = interaction.options.getString('message', true);

  const client = interaction.client;
  let sent = 0;
  let failed = 0;

  const embed = new EmbedBuilder()
    .setTitle('Announcement from Bot Owner')
    .setDescription(message)
    .setColor(COLORS.INFO)
    .setTimestamp();

  const BROADCAST_TIMEOUT = 5_000;

  const allGuilds = [...client.guilds.cache.values()];
  const totalGuilds = allGuilds.length;
  const {
    targets: guilds,
    skipped,
    overCap,
  } = planBroadcast(
    allGuilds,
    guildSettingsRepository.getAnnouncementChannel,
    BROADCAST_MAX_GUILDS
  );
  const addressable = guilds.length + overCap;
  const capped = overCap > 0;

  if (guilds.length === 0) {
    await interaction.reply({
      embeds: [
        createEmbed({
          title: t('common.error', locale),
          description: t('owner.broadcast.noChannel', locale),
          color: COLORS.WARNING,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const confirmed = await awaitConfirmation(
    interaction,
    t('owner.broadcast.confirm', locale, {
      count: guilds.length,
      total: totalGuilds,
      message,
    }),
    { ephemeral: true, timeout: 45_000 }
  );

  if (!confirmed) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('common.cancelled', locale),
          color: COLORS.INFO,
        }),
      ],
      components: [],
    });
    return;
  }

  await interaction.editReply({
    content: t('owner.broadcast.progress', locale, {
      processed: 0,
      total: guilds.length,
      sent: 0,
      failed: 0,
      capNote: capped ? ` [${BROADCAST_MAX_GUILDS}/${addressable}]` : '',
    }),
    embeds: [],
    components: [],
  });

  let processed = 0;
  for (const { guild, channelId } of guilds) {
    try {
      const channel = await getSendableTextChannel(guild, channelId);
      if (!channel) {
        // Configured but no longer usable: deleted, or the bot lost access.
        throw new Error(`Announcement channel ${channelId} is not sendable`);
      }
      await withTimeout(channel.send({ embeds: [embed] }), BROADCAST_TIMEOUT);
      sent++;
    } catch (error) {
      failed++;
      logger.debug(
        `Failed to send broadcast to guild ${guild.id}:`,
        getErrorMessage(error)
      );
    }
    processed++;
    if (
      processed % BROADCAST_PROGRESS_EVERY === 0 ||
      processed === guilds.length
    ) {
      const capNote = capped
        ? ` (cap ${BROADCAST_MAX_GUILDS}/${addressable} guilds)`
        : '';
      await interaction
        .editReply({
          content: t('owner.broadcast.progress', locale, {
            processed,
            total: guilds.length,
            sent,
            failed,
            capNote,
          }),
          embeds: [],
        })
        .catch((e: unknown) => {
          logger.debug(
            `Failed to edit broadcast progress: ${getErrorMessage(e)}`
          );
        });
    }
  }

  const capLine = capped
    ? t('owner.broadcast.capNote', locale, {
        limit: BROADCAST_MAX_GUILDS,
        total: addressable,
      })
    : '';

  const resultEmbed = createEmbed({
    title: locale === 'ja' ? '一斉通知完了' : 'Broadcast Complete',
    description: t('owner.broadcast.complete', locale, {
      sent,
      failed,
      skipped,
      capNote: capLine,
    }),
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.editReply({
    content: '',
    embeds: [resultEmbed],
  });
}

async function handleHealth(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'health');
}

async function handleBackupList(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'backups');
}

async function handleBackupRun(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  const confirmed = await awaitConfirmation(
    interaction,
    t('owner.backup.confirm', locale),
    { ephemeral: true }
  );

  if (!confirmed) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: t('common.cancelled', locale),
          color: COLORS.INFO,
        }),
      ],
      components: [],
    });
    return;
  }

  await interaction.editReply({
    embeds: [],
    components: [],
    content: locale === 'ja' ? 'バックアップを実行中...' : 'Running backup...',
  });

  const result = await backupService.runBackup();

  if (result.success) {
    const embed = createEmbed({
      title: locale === 'ja' ? 'バックアップ完了' : 'Backup Complete',
      description: t('owner.backup.complete', locale, {
        filename: result.filename,
        size: Math.round(result.size / 1024),
      }),
      color: COLORS.SUCCESS,
      timestamp: true,
    });
    await interaction.editReply({ content: '', embeds: [embed] });
  } else {
    const embed = createErrorEmbed(
      locale === 'ja' ? 'バックアップ失敗' : 'Backup Failed',
      t('owner.backup.failed', locale, {
        error: result.error || 'Unknown error occurred',
      })
    );
    await interaction.editReply({ content: '', embeds: [embed] });
  }
}

async function handleMetrics(
  interaction: ChatInputCommandInteraction,
  locale: Locale
): Promise<void> {
  await showAdminSystemPanel(interaction, locale, 'metrics');
}

export async function executeOwnerCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

  if (!checkOwner(interaction)) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('owner.errors.ownerOnly', locale)
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
