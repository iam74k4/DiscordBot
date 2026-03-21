import { VoiceConnection } from '@discordjs/voice';
import { Snowflake } from 'discord.js';

/**
 * Voice connection state
 */
export enum VoiceConnectionState {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnecting = 'disconnecting',
  Disconnected = 'disconnected',
  Error = 'error',
}

/**
 * Audio buffer configuration
 */
export interface AudioBufferConfig {
  /** Memory buffer duration in seconds (default: 120 = 2 minutes) */
  memoryBufferDuration: number;
  /** Disk buffer duration in seconds (default: 480 = 8 minutes) */
  diskBufferDuration: number;
  /** Total buffer duration in seconds (default: 600 = 10 minutes) */
  totalBufferDuration: number;
  /** Sample rate in Hz (default: 32000) */
  sampleRate: number;
  /** Bit depth (default: 16) */
  bitDepth: number;
  /** Number of channels (default: 1 = mono) */
  channels: number;
  /** Disk buffer directory path */
  diskBufferDir: string;
}

/**
 * Audio chunk with timestamp
 */
export interface AudioChunk {
  /** Audio data (PCM) */
  data: Buffer;
  /** Timestamp when the chunk was received */
  timestamp: number;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Recording options
 */
export interface RecordingOptions {
  /** Duration in seconds */
  duration: number;
  /** Channel ID where the recording is requested */
  channelId: Snowflake;
  /** User ID who requested the recording */
  userId: Snowflake;
  /** Guild ID */
  guildId: Snowflake;
}

/**
 * Recording result
 */
export interface RecordingResult {
  /** File path of the recorded audio */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
  /** Duration in seconds */
  duration: number;
  /** Whether the file was split */
  isSplit: boolean;
  /** Additional file paths if split */
  additionalFiles?: string[];
}

/**
 * Voice connection info
 */
export interface VoiceConnectionInfo {
  /** Voice connection instance */
  connection: VoiceConnection;
  /** Connection state */
  state: VoiceConnectionState;
  /** Channel ID */
  channelId: Snowflake;
  /** Guild ID */
  guildId: Snowflake;
  /** Connected at timestamp */
  connectedAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Memory monitor stats
 */
export interface MemoryMonitorStats {
  /** Current memory usage in MB */
  memoryUsageMB: number;
  /** Active voice connections count */
  activeConnections: number;
  /** Total buffer size in MB */
  totalBufferSizeMB: number;
  /** Disk buffer size in MB */
  diskBufferSizeMB: number;
}
