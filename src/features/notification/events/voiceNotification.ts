import {
  Events,
  PermissionFlagsBits,
  TextChannel,
  VoiceState,
} from 'discord.js';
import { Event } from '../../../types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';
import { voiceTracker } from '../services/voiceTracker.js';

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
  const userId = state.member!.user.id;
  const channel = state.channel!;

  voiceTracker.startSession(guildId, userId, channel.id, channel.name);

  const notifyChannelId = notificationChannelRepository.getEnabled(
    guildId,
    'voice'
  );
  if (!notifyChannelId) return;

  try {
    const textChannel = await state.guild.channels
      .fetch(notifyChannelId)
      .catch(() => null);
    if (!textChannel || !textChannel.isTextBased()) return;

    const perms = (textChannel as TextChannel).permissionsFor(
      state.guild.members.me!
    );
    if (!perms?.has(PermissionFlagsBits.SendMessages)) return;

    const embed = createEmbed({
      description: `**${state.member!.displayName}** が <#${channel.id}> に参加しました`,
      color: COLORS.SUCCESS,
      timestamp: true,
    });

    await (textChannel as TextChannel).send({ embeds: [embed] });
  } catch (error) {
    logger.debug(
      `Failed to send voice join notification: ${error instanceof Error ? error.message : error}`
    );
  }
}

async function handleLeave(guildId: string, state: VoiceState): Promise<void> {
  const userId = state.member!.user.id;
  const channel = state.channel!;

  voiceTracker.endSession(guildId, userId);

  const notifyChannelId = notificationChannelRepository.getEnabled(
    guildId,
    'voice'
  );
  if (!notifyChannelId) return;

  try {
    const textChannel = await state.guild.channels
      .fetch(notifyChannelId)
      .catch(() => null);
    if (!textChannel || !textChannel.isTextBased()) return;

    const perms = (textChannel as TextChannel).permissionsFor(
      state.guild.members.me!
    );
    if (!perms?.has(PermissionFlagsBits.SendMessages)) return;

    const embed = createEmbed({
      description: `**${state.member!.displayName}** が <#${channel.id}> から退出しました`,
      color: COLORS.ERROR,
      timestamp: true,
    });

    await (textChannel as TextChannel).send({ embeds: [embed] });
  } catch (error) {
    logger.debug(
      `Failed to send voice leave notification: ${error instanceof Error ? error.message : error}`
    );
  }
}

export default event;
