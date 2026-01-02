import {
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionDisconnectReason,
  EndBehaviorType,
} from '@discordjs/voice';
import {
  Guild,
  VoiceChannel,
  StageChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { env } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import {
  VoiceConnectionInfo,
  VoiceConnectionState,
} from '../../types/voice.js';
import { audioBufferManager } from './audioBuffer.js';

/**
 * Voice connection manager
 */
export class VoiceConnectionManager {
  private connections: Map<string, VoiceConnectionInfo> = new Map();
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
        selfMute: true, // Bot doesn't need to speak
      });

      // Create audio player
      const player = createAudioPlayer();

      connection.subscribe(player);

      // Set up audio reception for all users
      connection.receiver.speaking.on('start', (userId) => {
        // Get buffer for this channel
        const buffer = audioBufferManager.getBuffer(channelId);

        const audioStream = connection.receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 100,
          },
        });

        // Discord sends PCM at 48kHz, 16-bit, mono
        // Process audio stream
        audioStream.on('data', (chunk: Buffer) => {
          // Duration calculation: chunk size / (48000 samples/sec * 2 bytes/sample)
          const duration = (chunk.length / (48000 * 2)) * 1000; // in milliseconds

          buffer.addChunk(chunk, duration);
        });

        audioStream.on('error', (error) => {
          logger.debug(
            `Audio stream error for user ${userId} in channel ${channelId}:`,
            error instanceof Error ? error.message : error
          );
        });
      });

      // Set up connection state handlers
      connection.on('stateChange', (oldState, newState) => {
        this.handleStateChange(channelId, oldState.status, newState.status);
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
   * Handle connection state changes
   */
  private handleStateChange(
    channelId: string,
    oldStatus: VoiceConnectionStatus,
    newStatus: VoiceConnectionStatus
  ): void {
    const info = this.connections.get(channelId);
    if (!info) return;

    logger.debug(
      `Voice connection state changed for ${channelId}: ${oldStatus} -> ${newStatus}`
    );

    switch (newStatus) {
      case VoiceConnectionStatus.Ready:
        info.state = VoiceConnectionState.Connected;
        info.connectedAt = Date.now();
        logger.info(`Connected to voice channel ${channelId}`);
        break;

      case VoiceConnectionStatus.Disconnected: {
        // Check if this is a recoverable disconnect
        const connectionState = info.connection.state;
        if ('reason' in connectionState) {
          const disconnectReason = connectionState.reason;
          if (
            disconnectReason === VoiceConnectionDisconnectReason.Manual ||
            disconnectReason === VoiceConnectionDisconnectReason.EndpointRemoved
          ) {
            info.state = VoiceConnectionState.Disconnected;
            this.connections.delete(channelId);
            logger.info(`Disconnected from voice channel ${channelId}`);
          } else {
            // Attempt reconnection
            info.state = VoiceConnectionState.Error;
            this.attemptReconnect(channelId);
          }
        } else {
          info.state = VoiceConnectionState.Disconnected;
          this.connections.delete(channelId);
          logger.info(`Disconnected from voice channel ${channelId}`);
        }
        break;
      }

      case VoiceConnectionStatus.Connecting:
        info.state = VoiceConnectionState.Connecting;
        break;

      case VoiceConnectionStatus.Signalling:
        info.state = VoiceConnectionState.Connecting;
        break;

      default:
        break;
    }
  }

  /**
   * Attempt to reconnect to a voice channel
   */
  private async attemptReconnect(channelId: string): Promise<void> {
    const info = this.connections.get(channelId);
    if (!info) return;

    const maxRetries = env.RECORDING_RETRY_MAX;
    let retryCount = 0;

    const reconnect = async (): Promise<void> => {
      if (retryCount >= maxRetries) {
        logger.error(
          `Failed to reconnect to channel ${channelId} after ${maxRetries} attempts`
        );
        this.connections.delete(channelId);
        return;
      }

      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Exponential backoff, max 10s

      logger.info(
        `Attempting to reconnect to channel ${channelId} (attempt ${retryCount}/${maxRetries}) in ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        const connection = getVoiceConnection(info.guildId);
        if (
          connection &&
          connection.state.status === VoiceConnectionStatus.Ready
        ) {
          info.state = VoiceConnectionState.Connected;
          info.connection = connection;
          logger.info(`Reconnected to voice channel ${channelId}`);
        } else {
          await reconnect();
        }
      } catch (error) {
        logger.error(
          `Reconnection attempt ${retryCount} failed for channel ${channelId}:`,
          error instanceof Error ? error.message : error
        );
        await reconnect();
      }
    };

    await reconnect();
  }

  /**
   * Disconnect from a voice channel
   */
  async disconnect(channelId: string): Promise<void> {
    const info = this.connections.get(channelId);
    if (!info) return;

    try {
      info.connection.destroy();
      this.connections.delete(channelId);

      // Clean up audio buffer
      audioBufferManager.removeBuffer(channelId);

      logger.info(`Disconnected from voice channel ${channelId}`);
    } catch (error) {
      logger.error(
        `Error disconnecting from channel ${channelId}:`,
        error instanceof Error ? error.message : error
      );
      this.connections.delete(channelId);
      audioBufferManager.removeBuffer(channelId);
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
  disconnectOldest(count: number): void {
    const sorted = Array.from(this.connections.entries()).sort(
      (a, b) => a[1].connectedAt - b[1].connectedAt
    );

    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const [channelId] = sorted[i];
      this.disconnect(channelId);
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
