import { Events, VoiceState } from 'discord.js';
import { Event } from '../../../shared/types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';
import { voiceTracker } from '../tracking/voiceTracker.js';
import { getSendableTextChannel } from '../../../shared/utils/discord.js';

export const event: Event<typeof Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(
    client: ExtendedClient,
    oldState: VoiceState,
    newState: VoiceState
  ) {
    if (!client.isFullyReady) return;
    if (newState.member?.user.bot) return;

    const guildId = newState.guild.id;

    if (!oldState.channel && newState.channel) {
      await handleJoin(guildId, newState);
    }

    if (oldState.channel && !newState.channel) {
      await handleLeave(guildId, oldState);
    }

    if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await handleLeave(guildId, oldState);
      await handleJoin(guildId, newState);
    }
  },
};

async function handleJoin(guildId: string, state: VoiceState): Promise<void> {
  if (!state.member || !state.channel) return;

  const userId = state.member.user.id;
  const channel = state.channel;

  try {
    voiceTracker.startSession(guildId, userId, channel.id, channel.name);
  } catch (error) {
    logger.error(`Failed to start voice session: ${getErrorMessage(error)}`);
  }

  const notifyChannelId = notificationChannelRepository.getEnabled(
    guildId,
    'voice'
  );
  if (!notifyChannelId) return;

  try {
    const textChannel = await getSendableTextChannel(
      state.guild,
      notifyChannelId
    );
    if (!textChannel) return;

    const locale = mapDiscordLocale(state.guild.preferredLocale);
    const embed = createEmbed({
      description: t('notification.events.voiceJoin', locale, {
        name: state.member.displayName,
        channel: channel.id,
      }),
      color: COLORS.SUCCESS,
      timestamp: true,
    });

    await textChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(
      `Failed to send voice join notification: ${getErrorMessage(error)}`
    );
  }
}

async function handleLeave(guildId: string, state: VoiceState): Promise<void> {
  if (!state.member || !state.channel) return;

  const userId = state.member.user.id;
  const channel = state.channel;

  try {
    voiceTracker.endSession(guildId, userId);
  } catch (error) {
    logger.error(`Failed to end voice session: ${getErrorMessage(error)}`);
  }

  const notifyChannelId = notificationChannelRepository.getEnabled(
    guildId,
    'voice'
  );
  if (!notifyChannelId) return;

  try {
    const textChannel = await getSendableTextChannel(
      state.guild,
      notifyChannelId
    );
    if (!textChannel) return;

    const locale = mapDiscordLocale(state.guild.preferredLocale);
    const embed = createEmbed({
      description: t('notification.events.voiceLeave', locale, {
        name: state.member.displayName,
        channel: channel.id,
      }),
      color: COLORS.ERROR,
      timestamp: true,
    });

    await textChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(
      `Failed to send voice leave notification: ${getErrorMessage(error)}`
    );
  }
}

export default event;
