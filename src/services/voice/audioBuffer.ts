import { createWriteStream, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { env, AUDIO, MONITORING } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AudioBufferConfig, AudioChunk } from '../../types/voice.js';
import { BoundedMap } from '../../utils/lruCache.js';

// Maximum number of disk buffer files per channel
const MAX_DISK_BUFFER_FILES_PER_CHANNEL = 100;
// Maximum number of active channel buffers
const MAX_CHANNEL_BUFFERS = 50;

/**
 * Hybrid audio buffer (memory + disk)
 */
export class HybridAudioBuffer {
  private memoryBuffer: AudioChunk[] = [];
  private readonly memoryBufferDuration: number;
  private readonly totalBufferDuration: number;
  private readonly sampleRate: number;
  private readonly bitDepth: number;
  private readonly channels: number;
  private readonly diskBufferDir: string;
  private readonly channelId: string;
  private diskBufferFiles = new BoundedMap<number, string>(
    MAX_DISK_BUFFER_FILES_PER_CHANNEL
  ); // timestamp -> file path
  private readonly bytesPerSecond: number;

  constructor(channelId: string, config: AudioBufferConfig) {
    this.channelId = channelId;
    this.memoryBufferDuration = config.memoryBufferDuration;
    this.totalBufferDuration = config.totalBufferDuration;
    this.sampleRate = config.sampleRate;
    this.bitDepth = config.bitDepth;
    this.channels = config.channels;
    this.diskBufferDir = config.diskBufferDir;
    this.bytesPerSecond = (this.sampleRate * this.bitDepth * this.channels) / 8;

    // Ensure disk buffer directory exists
    const fullPath = join(process.cwd(), this.diskBufferDir, this.channelId);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Add audio chunk to buffer
   */
  addChunk(data: Buffer, duration: number): void {
    const chunk: AudioChunk = {
      data,
      timestamp: Date.now(),
      duration,
    };

    this.memoryBuffer.push(chunk);

    // Check if memory buffer exceeds duration
    const totalDuration = this.memoryBuffer.reduce(
      (sum, c) => sum + c.duration,
      0
    );

    if (totalDuration >= this.memoryBufferDuration * 1000) {
      // Move oldest chunks to disk
      this.moveOldestToDisk();
    }
  }

  /**
   * Move oldest chunks from memory to disk
   */
  private moveOldestToDisk(): void {
    if (this.memoryBuffer.length === 0) return;

    const now = Date.now();
    const cutoffTime = now - this.memoryBufferDuration * 1000;

    const chunksToMove: AudioChunk[] = [];
    const chunksToKeep: AudioChunk[] = [];

    for (const chunk of this.memoryBuffer) {
      if (chunk.timestamp < cutoffTime) {
        chunksToMove.push(chunk);
      } else {
        chunksToKeep.push(chunk);
      }
    }

    if (chunksToMove.length === 0) return;

    // Write chunks to disk asynchronously
    this.writeChunksToDisk(chunksToMove).catch((error) => {
      logger.error(
        `Failed to write chunks to disk for channel ${this.channelId}:`,
        error instanceof Error ? error.message : error
      );
    });

    // Update memory buffer
    this.memoryBuffer = chunksToKeep;

    logger.debug(
      `Moved ${chunksToMove.length} chunks to disk for channel ${this.channelId}`
    );
  }

  /**
   * Write chunks to disk
   */
  private async writeChunksToDisk(chunks: AudioChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const timestamp = chunks[0].timestamp;
    const filePath = join(
      process.cwd(),
      this.diskBufferDir,
      this.channelId,
      `buffer_${timestamp}.raw`
    );

    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath);
      let totalSize = 0;

      for (const chunk of chunks) {
        stream.write(chunk.data);
        totalSize += chunk.data.length;
      }

      stream.end();

      stream.on('finish', () => {
        this.diskBufferFiles.set(timestamp, filePath);
        logger.debug(
          `Written ${totalSize} bytes to disk buffer file: ${filePath}`
        );
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get audio data for specified duration (in seconds)
   */
  async getAudioData(duration: number): Promise<Buffer> {
    const durationMs = duration * 1000;
    const cutoffTime = Date.now() - durationMs;

    const memoryChunks: AudioChunk[] = [];
    const diskChunks: AudioChunk[] = [];

    // Collect chunks from memory
    for (const chunk of this.memoryBuffer) {
      if (chunk.timestamp >= cutoffTime) {
        memoryChunks.push(chunk);
      }
    }

    // Collect chunks from disk
    for (const [timestamp, filePath] of this.diskBufferFiles.entries()) {
      if (timestamp >= cutoffTime) {
        try {
          const data = readFileSync(filePath);
          const chunk: AudioChunk = {
            data,
            timestamp,
            duration: (data.length / this.bytesPerSecond) * 1000,
          };
          diskChunks.push(chunk);
        } catch (error) {
          logger.warn(
            `Failed to read disk buffer file ${filePath}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    // Sort all chunks by timestamp
    const allChunks = [...memoryChunks, ...diskChunks].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Combine chunks into single buffer
    const totalSize = allChunks.reduce(
      (sum, chunk) => sum + chunk.data.length,
      0
    );

    const result = Buffer.allocUnsafe(totalSize);
    let offset = 0;

    for (const chunk of allChunks) {
      chunk.data.copy(result, offset);
      offset += chunk.data.length;
    }

    return result;
  }

  /**
   * Clean up old disk buffer files
   */
  cleanupOldFiles(): void {
    const now = Date.now();
    const cutoffTime = now - this.totalBufferDuration * 1000;

    const filesToDelete: string[] = [];

    for (const [timestamp, filePath] of this.diskBufferFiles.entries()) {
      if (timestamp < cutoffTime) {
        filesToDelete.push(filePath);
        this.diskBufferFiles.delete(timestamp);
      }
    }

    // Delete files asynchronously
    for (const filePath of filesToDelete) {
      import('fs/promises')
        .then((fs) => fs.unlink(filePath))
        .catch((error) => {
          logger.warn(
            `Failed to delete old buffer file ${filePath}:`,
            error instanceof Error ? error.message : error
          );
        });
    }

    if (filesToDelete.length > 0) {
      logger.debug(
        `Cleaned up ${filesToDelete.length} old buffer files for channel ${this.channelId}`
      );
    }
  }

  /**
   * Get buffer statistics
   */
  getStats(): {
    memoryChunks: number;
    diskFiles: number;
    memorySizeMB: number;
    diskSizeMB: number;
  } {
    const memorySize = this.memoryBuffer.reduce(
      (sum, chunk) => sum + chunk.data.length,
      0
    );

    let diskSize = 0;
    for (const filePath of this.diskBufferFiles.values()) {
      try {
        if (existsSync(filePath)) {
          const stats = readFileSync(filePath);
          diskSize += stats.length;
        }
      } catch {
        // Ignore errors
      }
    }

    return {
      memoryChunks: this.memoryBuffer.length,
      diskFiles: this.diskBufferFiles.size,
      memorySizeMB: memorySize / (1024 * 1024),
      diskSizeMB: diskSize / (1024 * 1024),
    };
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this.memoryBuffer = [];
    this.cleanupOldFiles();
    this.diskBufferFiles.clear();
  }
}

/**
 * Audio buffer manager
 */
export class AudioBufferManager {
  private buffers = new BoundedMap<string, HybridAudioBuffer>(
    MAX_CHANNEL_BUFFERS
  );
  private readonly config: AudioBufferConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      memoryBufferDuration: env.AUDIO_MEMORY_BUFFER_DURATION,
      diskBufferDuration:
        env.AUDIO_BUFFER_DURATION - env.AUDIO_MEMORY_BUFFER_DURATION,
      totalBufferDuration: env.AUDIO_BUFFER_DURATION,
      sampleRate: AUDIO.SAMPLE_RATE,
      bitDepth: AUDIO.BIT_DEPTH,
      channels: AUDIO.CHANNELS,
      diskBufferDir: env.AUDIO_DISK_BUFFER_DIR,
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get or create buffer for channel
   */
  getBuffer(channelId: string): HybridAudioBuffer {
    if (!this.buffers.has(channelId)) {
      this.buffers.set(
        channelId,
        new HybridAudioBuffer(channelId, this.config)
      );
    }
    return this.buffers.get(channelId)!;
  }

  /**
   * Remove buffer for channel
   */
  removeBuffer(channelId: string): void {
    const buffer = this.buffers.get(channelId);
    if (buffer) {
      buffer.clear();
      this.buffers.delete(channelId);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      for (const buffer of this.buffers.values()) {
        buffer.cleanupOldFiles();
      }
    }, MONITORING.DISK_BUFFER_CLEANUP_INTERVAL_MS);

    logger.info('Started audio buffer cleanup interval');
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all buffer statistics
   */
  getAllStats(): Map<string, ReturnType<HybridAudioBuffer['getStats']>> {
    const stats = new Map();
    for (const [channelId, buffer] of this.buffers.entries()) {
      stats.set(channelId, buffer.getStats());
    }
    return stats;
  }
}

/**
 * Singleton instance
 */
export const audioBufferManager = new AudioBufferManager();
