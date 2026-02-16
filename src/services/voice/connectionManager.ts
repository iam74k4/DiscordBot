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
import prism from 'prism-media';
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

        // Subscribe to user's audio (returns Opus-encoded stream)
        const opusStream = connection.receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 100,
          },
        });

        // Create Opus decoder to convert to PCM
        // Discord sends: 48kHz, stereo, 16-bit signed little-endian
        const decoder = new prism.opus.Decoder({
          rate: 48000,
          channels: 2,
          frameSize: 960, // 20ms at 48kHz
        });

        // Pipe Opus stream through decoder
        const pcmStream = opusStream.pipe(decoder);

        // Process decoded PCM audio
        pcmStream.on('data', (chunk: Buffer) => {
          // Convert stereo (2 channels) to mono by averaging left and right channels
          // Input: 16-bit signed LE stereo (L R L R L R...)
          // Output: 16-bit signed LE mono
          const monoSamples = chunk.length / 4; // 4 bytes per stereo sample (2 bytes * 2 channels)
          const monoChunk = Buffer.allocUnsafe(monoSamples * 2);

          for (let i = 0; i < monoSamples; i++) {
            const left = chunk.readInt16LE(i * 4);
            const right = chunk.readInt16LE(i * 4 + 2);
            const mono = Math.round((left + right) / 2);
            monoChunk.writeInt16LE(mono, i * 2);
          }

          // Duration calculation: chunk size / (48000 samples/sec * 2 bytes/sample) for mono
          const duration = (monoChunk.length / (48000 * 2)) * 1000; // in milliseconds

          buffer.addChunk(monoChunk, duration);
        });

        pcmStream.on('error', (error) => {
          logger.debug(
            `Audio decode error for user ${userId}:`,
            error instanceof Error ? error.message : error
          );
        });

        opusStream.on('error', (error) => {
          logger.debug(
            `Audio stream error for user ${userId}:`,
            error instanceof Error ? error.message : error
          );
        });
      });

      // Handle disconnect using official discord.js pattern
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          // Reconnecting to a new channel - ignore disconnect
        } catch {
          // Real disconnect - clean up
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
