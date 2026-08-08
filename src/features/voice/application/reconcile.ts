import { ChannelType, Client, StageChannel, VoiceChannel } from 'discord.js';
import { connectionManager } from '../recording/connectionManager.js';
import { voiceSettingsRepository } from '../repositories/voiceSettingsRepository.js';
import { announceBuffering } from './announce.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

function humanMemberCount(channel: VoiceChannel | StageChannel): number {
  return channel.members.filter((member) => !member.user.bot).size;
}

function isJoinableVoiceChannel(
  channel: unknown
): channel is VoiceChannel | StageChannel {
  if (!channel || typeof channel !== 'object') return false;
  const typed = channel as { type?: number; members?: unknown };
  return (
    (typed.type === ChannelType.GuildVoice ||
      typed.type === ChannelType.GuildStageVoice) &&
    typed.members != null
  );
}

/**
 * After restart, Discord does not replay join transitions for users already in
 * VC. Without this scan the bot never auto-joins occupied channels until
 * someone joins/leaves/moves — breaking `/record` for the whole downtime gap.
 *
 * Discord allows one voice connection per guild; when multiple channels are
 * occupied we join the one with the most human members.
 */
export async function reconcileOccupiedVoiceChannels(
  client: Client
): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    if (connectionManager.isAtLimit()) {
      logger.warn(
        'Connection limit reached during voice reconcile; stopping early'
      );
      return;
    }

    if (!voiceSettingsRepository.isAutoJoinEnabled(guild.id)) {
      continue;
    }

    let alreadyConnectedInGuild = false;
    for (const info of connectionManager.getAllConnections().values()) {
      if (info.guildId === guild.id) {
        alreadyConnectedInGuild = true;
        break;
      }
    }
    if (alreadyConnectedInGuild) {
      continue;
    }

    let bestChannel: VoiceChannel | StageChannel | null = null;
    let bestCount = 0;

    for (const channel of guild.channels.cache.values()) {
      if (!isJoinableVoiceChannel(channel)) continue;
      if (voiceSettingsRepository.isChannelExcluded(guild.id, channel.id))
        continue;
      const count = humanMemberCount(channel);
      if (count > bestCount) {
        bestChannel = channel;
        bestCount = count;
      }
    }

    if (!bestChannel || bestCount === 0) {
      continue;
    }

    try {
      const connection = await connectionManager.connect(guild, bestChannel);
      if (!connection) {
        logger.warn(
          `Voice reconcile failed to connect to ${bestChannel.name} (${bestChannel.id}) in guild ${guild.name}`
        );
        continue;
      }

      // Membership can change while connect awaits; do not hold empty slots.
      if (humanMemberCount(bestChannel) === 0) {
        logger.info(
          `Channel ${bestChannel.name} (${bestChannel.id}) emptied during reconcile. Disconnecting...`
        );
        await connectionManager.disconnect(bestChannel.id);
        continue;
      }

      logger.info(
        `Reconciled voice connection to ${bestChannel.name} (${bestChannel.id}) in guild ${guild.name}`
      );

      await announceBuffering(bestChannel);
    } catch (error) {
      logger.error(
        `Voice reconcile error for guild ${guild.id}:`,
        getErrorMessage(error)
      );
    }
  }
}
