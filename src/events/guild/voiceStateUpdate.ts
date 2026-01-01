import { Events, VoiceState } from 'discord.js';
import { Event } from '../../types/index.js';
import { ExtendedClient } from '../../client.js';
import { connectionManager } from '../../services/voice/connectionManager.js';
import { audioBufferManager } from '../../services/voice/audioBuffer.js';
import { logger } from '../../utils/logger.js';

/**
 * Voice State Update event handler
 */
export const event: Event<typeof Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(client: ExtendedClient, oldState: VoiceState, newState: VoiceState) {
    // Ignore bot's own state changes
    if (newState.member?.user.id === client.user?.id) {
      return;
    }

    // User joined a voice channel
    if (!oldState.channel && newState.channel) {
      await handleUserJoined(client, newState);
    }

    // User left a voice channel
    if (oldState.channel && !newState.channel) {
      await handleUserLeft(client, oldState);
    }

    // User moved to a different channel
    if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await handleUserMoved(client, oldState, newState);
    }
  },
};

/**
 * Handle user joining a voice channel
 */
async function handleUserJoined(
  _client: ExtendedClient,
  state: VoiceState
): Promise<void> {
  if (!state.channel || !state.guild) return;

  const channel = state.channel;
  const guild = state.guild;

  // Check if bot is already connected to this channel
  const existingConnection = connectionManager.getConnection(channel.id);
  if (existingConnection) {
    connectionManager.updateActivity(channel.id);
    return;
  }

  // Check connection limit
  if (connectionManager.isAtLimit()) {
    logger.warn(
      `Connection limit reached. Cannot auto-join channel ${channel.name} (${channel.id})`
    );
    return;
  }

  // Connect to voice channel
  const connection = await connectionManager.connect(guild, channel);
  if (connection) {
    logger.info(
      `Auto-joined voice channel ${channel.name} (${channel.id}) in guild ${guild.name}`
    );
  }
}

/**
 * Handle user leaving a voice channel
 */
async function handleUserLeft(
  _client: ExtendedClient,
  state: VoiceState
): Promise<void> {
  if (!state.channel || !state.guild) return;

  const channel = state.channel;

  // Check if bot is connected to this channel
  const connection = connectionManager.getConnection(channel.id);
  if (!connection) return;

  // Check if there are any other users in the channel (excluding bots)
  const members = channel.members.filter((member) => !member.user.bot);

  if (members.size === 0) {
    // No users left, disconnect
    logger.info(
      `No users left in channel ${channel.name} (${channel.id}). Disconnecting...`
    );
    await connectionManager.disconnect(channel.id);
    audioBufferManager.removeBuffer(channel.id);
  }
}

/**
 * Handle user moving to a different channel
 */
async function handleUserMoved(
  client: ExtendedClient,
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  // Handle leaving old channel
  await handleUserLeft(client, oldState);

  // Handle joining new channel
  await handleUserJoined(client, newState);
}

export default event;

