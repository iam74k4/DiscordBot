import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import type { AppConfig } from '../../../config/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

/**
 * File cleanup service for recording files
 */
export class FileCleanupService {
  private interval: NodeJS.Timeout | null = null;
  private readonly retentionHours: number;
  private readonly recordingsDir: string;

  constructor(
    config: Pick<AppConfig, 'RECORDING_RETENTION_HOURS' | 'RECORDINGS_DIR'>
  ) {
    this.retentionHours = config.RECORDING_RETENTION_HOURS;
    this.recordingsDir = config.RECORDINGS_DIR;
  }

  /**
   * Start periodic cleanup
   */
  start(): void {
    if (this.interval) {
      logger.warn('File cleanup service is already running');
      return;
    }

    // Run cleanup immediately
    this.cleanup().catch((error) => {
      logger.error('Initial cleanup failed:', error);
    });

    // Run cleanup every hour
    this.interval = setInterval(() => {
      this.cleanup().catch((error) => {
        logger.error('Periodic cleanup failed:', error);
      });
    }, 3600000); // 1 hour

    logger.info('File cleanup service started');
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('File cleanup service stopped');
    }
  }

  /**
   * Clean up old recording files
   */
  async cleanup(): Promise<void> {
    const recordingsDir = join(process.cwd(), this.recordingsDir);
    const retentionMs = this.retentionHours * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    try {
      const files = await readdir(recordingsDir);
      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (!file.endsWith('.wav')) continue;

        const filePath = join(recordingsDir, file);
        try {
          const stats = await stat(filePath);
          if (stats.mtimeMs < cutoffTime) {
            await unlink(filePath);
            deletedCount++;
            totalSize += stats.size;
            logger.debug(`Deleted old recording file: ${file}`);
          }
        } catch (error) {
          logger.warn(
            `Failed to process file ${file}:`,
            getErrorMessage(error)
          );
        }
      }

      if (deletedCount > 0) {
        logger.info(
          `Cleaned up ${deletedCount} old recording files (${(totalSize / (1024 * 1024)).toFixed(2)}MB)`
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist yet, that's fine
        return;
      }
      throw error;
    }
  }

  /**
   * Get disk usage statistics
   */
  async getDiskUsage(): Promise<{
    fileCount: number;
    totalSizeMB: number;
  }> {
    const recordingsDir = join(process.cwd(), this.recordingsDir);

    try {
      const files = await readdir(recordingsDir);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        if (!file.endsWith('.wav')) continue;

        const filePath = join(recordingsDir, file);
        try {
          const stats = await stat(filePath);
          totalSize += stats.size;
          fileCount++;
        } catch (err) {
          logger.debug(
            `Skipped file ${file} (stat failed): ${getErrorMessage(err)}`
          );
        }
      }

      return {
        fileCount,
        totalSizeMB: totalSize / (1024 * 1024),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { fileCount: 0, totalSizeMB: 0 };
      }
      throw error;
    }
  }
}
