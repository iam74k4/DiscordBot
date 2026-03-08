import {
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  joinVoiceChannel,
  entersState,
  EndBehaviorType,
} from '@discordjs/voice';
import {
  Guild,
  VoiceChannel,
  StageChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { Readable } from 'stream';
import prism from 'prism-media';
import { env } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import {
  VoiceConnectionInfo,
  VoiceConnectionState,
} from '../../../types/voice.js';
import { audioBufferManager } from './audioBuffer.js';

/**
 * Voice connection manager
 */
export class VoiceConnectionManager {
  private connections: Map<string, VoiceConnectionInfo> = new Map();
  private activeStreams: Map<string, Set<Readable>> = new Map();
  private readonly maxConnections: number;

  constructor() {
    this.maxConnections = env.MAX_CONCURRENT_VC_CONNECTIONS;
  }

  /**
   * Check if bot has permission to connect to voice channel
   */
  private async checkPermissions(
    channel: VoiceChannel | StageChannel
  ): Promise<boolean> {
    const permissions = channel.permissionsFor(channel.guild.members.me!);
    if (!permissions) return false;

    return permissions.has(PermissionFlagsBits.Connect);
  }

  /**
   * Connect to a voice channel
   */
  async connect(
    guild: Guild,
    channel: VoiceChannel | StageChannel
  ): Promise<VoiceConnection | null> {
    const channelId = channel.id;

    // Check if already connected
    if (this.connections.has(channelId)) {
      const info = this.connections.get(channelId)!;
      if (info.state === VoiceConnectionState.Connected) {
        logger.debug(`Already connected to channel ${channelId}`);
        return info.connection;
      }
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      logger.warn(
        `Connection limit reached (${this.maxConnections}). Cannot connect to channel ${channelId}`
      );
      return null;
    }

    // Check permissions
    const hasPermission = await this.checkPermissions(channel);
    if (!hasPermission) {
      logger.warn(
        `Bot does not have permission to connect to channel ${channelId}`
      );
      return null;
    }

    try {
      // Create voice connection
      // selfDeaf: false is required to receive audio for recording
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
      });

      // Create audio player
      const player = createAudioPlayer();

      connection.subscribe(player);

      // Track active streams for cleanup on disconnect
      this.activeStreams.set(channelId, new Set());

      // Track subscribed users to avoid duplicate subscriptions
      const subscribedUsers = new Set<string>();

      // Set up audio reception for all users
      connection.receiver.speaking.on('start', (userId) => {
        if (subscribedUsers.has(userId)) return;
        subscribedUsers.add(userId);
        logger.debug(
          `Speaking started for user ${userId} in channel ${channelId}`
        );

        const buffer = audioBufferManager.getBuffer(channelId);

        const opusStream = connection.receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 1000,
          },
        });

        const decoder = new prism.opus.Decoder({
          rate: 48000,
          channels: 2,
          frameSize: 960,
        });

        const pcmStream = opusStream.pipe(decoder);

        const streams = this.activeStreams.get(channelId);
        if (streams) {
          streams.add(opusStream as unknown as Readable);
          streams.add(pcmStream as unknown as Readable);
        }

        const cleanup = () => {
          subscribedUsers.delete(userId);
          if (!opusStream.destroyed) opusStream.destroy();
          if (!pcmStream.destroyed) pcmStream.destroy();
          if (streams) {
            streams.delete(opusStream as unknown as Readable);
            streams.delete(pcmStream as unknown as Readable);
          }
        };

        let chunkCount = 0;
        pcmStream.on('data', (chunk: Buffer) => {
          chunkCount++;
          if (chunkCount === 1) {
            logger.debug(
              `First audio chunk received from user ${userId} (${chunk.length} bytes)`
            );
          }
          const monoSamples = chunk.length / 4;
          const monoChunk = Buffer.allocUnsafe(monoSamples * 2);

          for (let i = 0; i < monoSamples; i++) {
            const left = chunk.readInt16LE(i * 4);
            const right = chunk.readInt16LE(i * 4 + 2);
            const mono = Math.round((left + right) / 2);
            monoChunk.writeInt16LE(mono, i * 2);
          }

          const duration = (monoChunk.length / (48000 * 2)) * 1000;
          buffer.addChunk(monoChunk, duration);
        });

        pcmStream.on('error', (error) => {
          logger.debug(
            `Audio decode error for user ${userId}:`,
            error instanceof Error ? error.message : error
          );
          cleanup();
        });

        opusStream.on('error', (error) => {
          logger.debug(
            `Audio stream error for user ${userId}:`,
            error instanceof Error ? error.message : error
          );
          cleanup();
        });

        pcmStream.on('close', () => {
          cleanup();
        });
      });

      connection.on('stateChange', (oldState, newState) => {
        logger.debug(
          `Voice connection state: ${oldState.status} -> ${newState.status}`
        );
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          // Reconnecting to a new channel - ignore disconnect
        } catch {
          // Real disconnect - clean up
          this.destroyStreamsForChannel(channelId);
          connection.destroy();
          this.connections.delete(channelId);
          audioBufferManager.removeBuffer(channelId);
          logger.info(`Disconnected from voice channel ${channelId}`);
        }
      });

      connection.on(VoiceConnectionStatus.Ready, () => {
        const connInfo = this.connections.get(channelId);
        if (connInfo) {
          connInfo.state = VoiceConnectionState.Connected;
          connInfo.connectedAt = Date.now();
        }
        logger.info(`Connected to voice channel ${channelId}`);
      });

      // Store connection info
      const info: VoiceConnectionInfo = {
        connection,
        state: VoiceConnectionState.Connecting,
        channelId,
        guildId: guild.id,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.connections.set(channelId, info);

      logger.info(
        `Connecting to voice channel ${channel.name} (${channelId}) in guild ${guild.name}`
      );

      return connection;
    } catch (error) {
      logger.error(
        `Failed to connect to voice channel ${channelId}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Disconnect from a voice channel
   */
  async disconnect(channelId: string): Promise<void> {
    const info = this.connections.get(channelId);
    if (!info) return;

    try {
      // Destroy all active audio streams for this channel
      this.destroyStreamsForChannel(channelId);

      info.connection.destroy();
      this.connections.delete(channelId);

      audioBufferManager.removeBuffer(channelId);

      logger.info(`Disconnected from voice channel ${channelId}`);
    } catch (error) {
      logger.error(
        `Error disconnecting from channel ${channelId}:`,
        error instanceof Error ? error.message : error
      );
      this.destroyStreamsForChannel(channelId);
      this.connections.delete(channelId);
      audioBufferManager.removeBuffer(channelId);
    }
  }

  private destroyStreamsForChannel(channelId: string): void {
    const streams = this.activeStreams.get(channelId);
    if (streams) {
      for (const stream of streams) {
        try {
          if (!stream.destroyed) {
            stream.destroy();
          }
        } catch {
          // Stream may already be destroyed
        }
      }
      this.activeStreams.delete(channelId);
    }
  }

  /**
   * Get connection info
   */
  getConnection(channelId: string): VoiceConnectionInfo | undefined {
    return this.connections.get(channelId);
  }

  /**
   * Get all active connections
   */
  getAllConnections(): Map<string, VoiceConnectionInfo> {
    return new Map(this.connections);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if at connection limit
   */
  isAtLimit(): boolean {
    return this.connections.size >= this.maxConnections;
  }

  /**
   * Disconnect oldest connections if memory threshold is exceeded
   */
  async disconnectOldest(count: number): Promise<void> {
    const sorted = Array.from(this.connections.entries()).sort(
      (a, b) => a[1].connectedAt - b[1].connectedAt
    );

    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const [channelId] = sorted[i];
      await this.disconnect(channelId);
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(channelId: string): void {
    const info = this.connections.get(channelId);
    if (info) {
      info.lastActivity = Date.now();
    }
  }
}

/**
 * Singleton instance
 */
export const connectionManager = new VoiceConnectionManager();
