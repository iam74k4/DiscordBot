import { createWriteStream } from 'fs';
import { readFile, stat, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { env, AUDIO, MONITORING } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import { AudioBufferConfig, AudioChunk } from '../../../types/voice.js';

// Maximum number of disk buffer files per channel
const MAX_DISK_BUFFER_FILES_PER_CHANNEL = 100;

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
  private diskBufferFiles = new Map<number, string>(); // timestamp -> file path
  private readonly bytesPerSecond: number;
  private diskWriteQueue: Promise<void> = Promise.resolve();

  constructor(channelId: string, config: AudioBufferConfig) {
    this.channelId = channelId;
    this.memoryBufferDuration = config.memoryBufferDuration;
    this.totalBufferDuration = config.totalBufferDuration;
    this.sampleRate = config.sampleRate;
    this.bitDepth = config.bitDepth;
    this.channels = config.channels;
    this.diskBufferDir = config.diskBufferDir;
    this.bytesPerSecond = (this.sampleRate * this.bitDepth * this.channels) / 8;
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

    const chunksToMove: AudioChunk[] = [];
    let totalDuration = this.memoryBuffer.reduce(
      (sum, chunk) => sum + chunk.duration,
      0
    );

    while (
      this.memoryBuffer.length > 0 &&
      totalDuration >= this.memoryBufferDuration * 1000
    ) {
      const chunk = this.memoryBuffer.shift();
      if (!chunk) break;
      chunksToMove.push(chunk);
      totalDuration -= chunk.duration;
    }

    if (chunksToMove.length === 0) return;

    this.diskWriteQueue = this.diskWriteQueue
      .then(() => this.writeChunksToDisk(chunksToMove))
      .catch((error) => {
        logger.error(
          `Failed to write chunks to disk for channel ${this.channelId}:`,
          error instanceof Error ? error.message : error
        );
        // Restore evicted chunks to memory so audio data is not lost.
        this.memoryBuffer = [...chunksToMove, ...this.memoryBuffer];
      });

    logger.debug(
      `Moved ${chunksToMove.length} chunks to disk for channel ${this.channelId}`
    );
  }

  /**
   * Write chunks to disk
   */
  private async writeChunksToDisk(chunks: AudioChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const dirPath = join(process.cwd(), this.diskBufferDir, this.channelId);
    await mkdir(dirPath, { recursive: true });

    const timestamp = chunks[0].timestamp;
    const filePath = join(dirPath, `buffer_${timestamp}.raw`);

    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath);
      let totalSize = 0;

      stream.on('error', (error) => {
        stream.destroy();
        reject(error);
      });

      stream.on('finish', () => {
        while (this.diskBufferFiles.size >= MAX_DISK_BUFFER_FILES_PER_CHANNEL) {
          const oldestEntry = this.diskBufferFiles.entries().next().value;
          if (!oldestEntry) {
            break;
          }

          const [oldestTimestamp, oldestFilePath] = oldestEntry;
          this.diskBufferFiles.delete(oldestTimestamp);
          unlink(oldestFilePath).catch((error) => {
            logger.warn(
              `Failed to delete old disk buffer file ${oldestFilePath}:`,
              error instanceof Error ? error.message : error
            );
          });
        }

        this.diskBufferFiles.set(timestamp, filePath);
        logger.debug(
          `Written ${totalSize} bytes to disk buffer file: ${filePath}`
        );
        resolve();
      });

      for (const chunk of chunks) {
        stream.write(chunk.data);
        totalSize += chunk.data.length;
      }

      stream.end();
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

    // Collect chunks from disk (async)
    const diskReadPromises: Promise<void>[] = [];
    for (const [timestamp, filePath] of this.diskBufferFiles.entries()) {
      if (timestamp >= cutoffTime) {
        diskReadPromises.push(
          readFile(filePath)
            .then((data) => {
              diskChunks.push({
                data,
                timestamp,
                duration: (data.length / this.bytesPerSecond) * 1000,
              });
            })
            .catch((error) => {
              logger.warn(
                `Failed to read disk buffer file ${filePath}:`,
                error instanceof Error ? error.message : error
              );
            })
        );
      }
    }
    await Promise.all(diskReadPromises);

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

    for (const filePath of filesToDelete) {
      unlink(filePath).catch((error) => {
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
  async getStats(): Promise<{
    memoryChunks: number;
    diskFiles: number;
    memorySizeMB: number;
    diskSizeMB: number;
  }> {
    const memorySize = this.memoryBuffer.reduce(
      (sum, chunk) => sum + chunk.data.length,
      0
    );

    let diskSize = 0;
    const statPromises: Promise<void>[] = [];
    for (const filePath of this.diskBufferFiles.values()) {
      statPromises.push(
        stat(filePath)
          .then((s) => {
            diskSize += s.size;
          })
          .catch(() => {
            // File may have been deleted
          })
      );
    }
    await Promise.all(statPromises);

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
    for (const [, filePath] of this.diskBufferFiles.entries()) {
      unlink(filePath).catch((e) => {
        logger.debug(`Failed to delete buffer file ${filePath}: ${e}`);
      });
    }
    this.diskBufferFiles.clear();
  }
}

/**
 * Audio buffer manager
 */
export class AudioBufferManager {
  private buffers = new Map<string, HybridAudioBuffer>();
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
  startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

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
      logger.info('Stopped audio buffer cleanup interval');
    }
  }

  /**
   * Get all buffer statistics
   */
  async getAllStats(): Promise<
    Map<string, Awaited<ReturnType<HybridAudioBuffer['getStats']>>>
  > {
    const stats = new Map();
    const entries = Array.from(this.buffers.entries());
    const results = await Promise.all(
      entries.map(async ([channelId, buffer]) => ({
        channelId,
        stats: await buffer.getStats(),
      }))
    );
    for (const { channelId, stats: s } of results) {
      stats.set(channelId, s);
    }
    return stats;
  }
}

/**
 * Singleton instance
 */
export const audioBufferManager = new AudioBufferManager();
