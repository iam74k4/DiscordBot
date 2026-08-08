import {
  PermissionFlagsBits,
  type StageChannel,
  type VoiceChannel,
} from 'discord.js';
import { env } from '../../../config/index.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { mapDiscordLocale, t } from '../../../locales/index.js';
import { resolveGuildLocale } from '../../../locales/guildLocale.js';

/**
 * Channels already told about buffering, so a reconnect does not repeat it.
 * Cleared when the bot leaves the channel.
 */
const announced = new Set<string>();

export function forgetAnnouncement(channelId: string): void {
  announced.delete(channelId);
}

/**
 * Tell the people in a voice channel that their audio is being buffered.
 *
 * The bot joins automatically and keeps several minutes of everyone's audio
 * so `/voice record` can reach back in time; posting into the channel's own
 * text chat is what makes that visible to the people actually affected.
 *
 * Best effort by design - a missing permission or a failed send must never
 * interfere with the voice connection itself.
 */
export async function announceBuffering(
  channel: VoiceChannel | StageChannel
): Promise<void> {
  if (announced.has(channel.id)) return;
  announced.add(channel.id);

  try {
    const me = channel.guild.members.me;
    if (!me) return;

    const permissions = channel.permissionsFor(me);
    if (
      !permissions?.has(PermissionFlagsBits.ViewChannel) ||
      !permissions.has(PermissionFlagsBits.SendMessages)
    ) {
      logger.debug(
        `Cannot announce buffering in ${channel.id}: missing send permission`
      );
      return;
    }

    if (!channel.isTextBased()) return;

    const locale = resolveGuildLocale(
      channel.guild.id,
      mapDiscordLocale(channel.guild.preferredLocale)
    );
    const minutes = Math.round(env.AUDIO_BUFFER_DURATION / 60);

    await channel.send({
      embeds: [
        createEmbed({
          title: t('record.notice.title', locale),
          description: `${t('record.notice.body', locale, { minutes })}\n\n${t(
            'record.notice.optOut',
            locale
          )}`,
          color: COLORS.WARNING,
        }),
      ],
    });
  } catch (error) {
    // Keep the buffering itself working even if the disclosure fails.
    logger.warn(
      `Failed to announce buffering in ${channel.id}: ${getErrorMessage(error)}`
    );
  }
}
