import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { env } from '../../../config/index.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { voiceSettingsRepository } from '../repositories/voiceSettingsRepository.js';
import { connectionManager } from '../recording/connectionManager.js';

/**
 * `/voice autojoin` - control whether the bot joins voice channels and keeps
 * their audio. Gated by the command's ManageGuild middleware.
 */
export async function executeAutoJoinCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

  if (!interaction.guild || !interaction.guildId) {
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
  const subcommand = interaction.options.getSubcommand();
  const minutes = Math.round(env.AUDIO_BUFFER_DURATION / 60);

  if (subcommand === 'enable' || subcommand === 'disable') {
    const enable = subcommand === 'enable';
    voiceSettingsRepository.setAutoJoinEnabled(guildId, enable);

    // Turning it off should stop the buffering already in progress, not just
    // prevent the next join — including joins still awaiting Ready.
    if (!enable) {
      for (const [channelId, info] of connectionManager.getAllConnections()) {
        if (info.guildId === guildId) {
          await connectionManager.disconnect(channelId);
        }
      }
      const inFlight = connectionManager.getInFlightChannelForGuild(guildId);
      if (inFlight) {
        await connectionManager.awaitConnecting(inFlight);
        await connectionManager.disconnect(inFlight);
      }
    }

    await interaction.reply({
      embeds: [
        createEmbed({
          title: t('record.autojoin.title', locale),
          description: enable
            ? t('record.autojoin.enabled', locale, { minutes })
            : t('record.autojoin.disabled', locale),
          color: enable ? COLORS.SUCCESS : COLORS.WARNING,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  if (
    channel.type !== ChannelType.GuildVoice &&
    channel.type !== ChannelType.GuildStageVoice
  ) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('record.errors.notInVoiceDesc', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommand === 'exclude') {
    voiceSettingsRepository.addExclusion(guildId, channel.id);

    // Wait out an in-flight join so exclude cannot lose the race to connect().
    await connectionManager.awaitConnecting(channel.id);
    if (connectionManager.getConnection(channel.id)) {
      await connectionManager.disconnect(channel.id);
    }

    await interaction.reply({
      embeds: [
        createEmbed({
          title: t('record.autojoin.title', locale),
          description: t('record.autojoin.excluded', locale, {
            channel: channel.id,
          }),
          color: COLORS.WARNING,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const removed = voiceSettingsRepository.removeExclusion(guildId, channel.id);
  await interaction.reply({
    embeds: [
      removed
        ? createEmbed({
            title: t('record.autojoin.title', locale),
            description: t('record.autojoin.included', locale, {
              channel: channel.id,
            }),
            color: COLORS.SUCCESS,
          })
        : createErrorEmbed(
            t('common.error', locale),
            t('record.autojoin.notExcluded', locale, { channel: channel.id })
          ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
