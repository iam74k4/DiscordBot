import { Events, VoiceState } from 'discord.js';
import { Event } from '../../../shared/types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveGuildLocale } from '../../../locales/guildLocale.js';
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
      return;
    }

    if (oldState.channel && !newState.channel) {
      await handleLeave(guildId, oldState);
      return;
    }

    if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await handleMove(guildId, oldState, newState);
    }
  },
};

function startSessionFromState(guildId: string, state: VoiceState): void {
  if (!state.member || !state.channel) return;
  voiceTracker.startSession(
    guildId,
    state.member.user.id,
    state.channel.id,
    state.channel.name
  );
}

function endSessionFromState(guildId: string, state: VoiceState): void {
  if (!state.member) return;
  voiceTracker.endSession(guildId, state.member.user.id);
}

async function handleJoin(guildId: string, state: VoiceState): Promise<void> {
  try {
    startSessionFromState(guildId, state);
  } catch (error) {
    logger.error(`Failed to start voice session: ${getErrorMessage(error)}`);
  }

  await sendVoiceNotification(guildId, state, 'join');
}

async function handleLeave(guildId: string, state: VoiceState): Promise<void> {
  try {
    endSessionFromState(guildId, state);
  } catch (error) {
    logger.error(`Failed to end voice session: ${getErrorMessage(error)}`);
  }

  await sendVoiceNotification(guildId, state, 'leave');
}

/**
 * Move must finish the session transition before any Discord I/O.
 * Event listeners are not awaited by the dispatcher, so a concurrent leave
 * during leave-notify can otherwise race ahead of startSession and leave a
 * ghost open session for a channel the user already left.
 */
async function handleMove(
  guildId: string,
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  try {
    endSessionFromState(guildId, oldState);
    startSessionFromState(guildId, newState);
  } catch (error) {
    logger.error(
      `Failed to transition voice session on move: ${getErrorMessage(error)}`
    );
  }

  await sendVoiceNotification(guildId, oldState, 'leave');
  await sendVoiceNotification(guildId, newState, 'join');
}

async function sendVoiceNotification(
  guildId: string,
  state: VoiceState,
  kind: 'join' | 'leave'
): Promise<void> {
  if (!state.member || !state.channel) return;

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

    const locale = resolveGuildLocale(
      guildId,
      mapDiscordLocale(state.guild.preferredLocale)
    );
    const embed = createEmbed({
      description: t(
        kind === 'join'
          ? 'notification.events.voiceJoin'
          : 'notification.events.voiceLeave',
        locale,
        {
          name: state.member.displayName,
          channel: state.channel.id,
        }
      ),
      color: kind === 'join' ? COLORS.SUCCESS : COLORS.ERROR,
      timestamp: true,
    });

    await textChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(
      `Failed to send voice ${kind} notification: ${getErrorMessage(error)}`
    );
  }
}

export default event;
