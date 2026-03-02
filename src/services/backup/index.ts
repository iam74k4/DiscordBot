import * as fsp from 'fs/promises';
import * as path from 'path';
import * as cron from 'node-cron';
import { env } from '../../config/index.js';
import { database } from '../database/index.js';
import { logger } from '../../utils/logger.js';
import {
  createBackupStorage,
  validateBackupFilename,
  type IBackupStorage,
} from './storage/index.js';

/**
 * Backup result information
 */
export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  timestamp: Date;
  error?: string;
}

/**
 * Backup file information
 */
export interface BackupInfo {
  filename: string;
  path?: string;
  size: number;
  createdAt: Date;
  shareLink?: string;
}

/**
 * Backup service for database backups
 */
class BackupService {
  private task: cron.ScheduledTask | null = null;
  private backupDir: string;
  private storage: IBackupStorage;
  private initialized: Promise<void>;

  constructor() {
    this.backupDir = env.BACKUP_DIR;
    this.storage = createBackupStorage();
    this.initialized = this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists (for local temp files)
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fsp.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      logger.warn(
        'Failed to create backup directory:',
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Generate backup filename
   */
  private generateFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `backup-${timestamp}.db`;
  }

  /**
   * Run a database backup
   */
  async runBackup(): Promise<BackupResult> {
    await this.initialized;
    const filename = this.generateFilename();
    const backupPath = path.join(this.backupDir, filename);

    try {
      logger.info('Starting database backup...');

      try {
        database.pragma('wal_checkpoint(TRUNCATE)');
        logger.debug('WAL checkpoint completed');
      } catch (walError) {
        logger.warn('WAL checkpoint failed (non-fatal):', walError);
      }

      await database.backup(backupPath);

      const stats = await fsp.stat(backupPath);

      try {
        await this.storage.put(filename, backupPath);
      } catch (storageError) {
        const errorMessage =
          storageError instanceof Error
            ? storageError.message
            : 'Unknown error';
        logger.error('Storage upload failed:', errorMessage);

        return {
          success: false,
          filename,
          size: stats.size,
          timestamp: new Date(),
          error: errorMessage,
        };
      }

      if (env.BACKUP_STORAGE_TYPE === 'google_drive') {
        try {
          await fsp.unlink(backupPath);
        } catch (unlinkError) {
          logger.warn(
            'Failed to remove local backup after upload:',
            unlinkError instanceof Error ? unlinkError.message : unlinkError
          );
        }
      }

      logger.info(
        `Backup completed: ${filename} (${Math.round(stats.size / 1024)} KB)`
      );

      const deleted = await this.deleteOldBackups();
      if (deleted > 0) {
        logger.info(`Deleted ${deleted} old backup(s)`);
      }

      return {
        success: true,
        filename,
        size: stats.size,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Backup failed:', errorMessage);

      return {
        success: false,
        filename,
        size: 0,
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    await this.ensureBackupDir();

    try {
      const files = await this.storage.list();

      return files.map((f) => ({
        filename: f.filename,
        path: f.path,
        size: f.size,
        createdAt: f.createdAt,
        shareLink: f.shareLink,
      }));
    } catch (error) {
      logger.error(
        'Failed to list backups:',
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  /**
   * Delete backups older than retention period
   */
  async deleteOldBackups(): Promise<number> {
    const retentionMs = env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    let deleted = 0;

    const backups = await this.listBackups();

    for (const backup of backups) {
      if (backup.createdAt < cutoffDate) {
        try {
          await this.storage.delete(backup.filename);
          deleted++;
          logger.debug(`Deleted old backup: ${backup.filename}`);
        } catch (error) {
          logger.warn(`Failed to delete backup ${backup.filename}:`, error);
        }
      }
    }

    return deleted;
  }

  /**
   * Restore from a backup file
   * WARNING: This will overwrite the current database
   */
  async restore(
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!validateBackupFilename(filename)) {
      return { success: false, error: 'Invalid backup filename format' };
    }

    try {
      let data: Buffer;

      const backups = await this.listBackups();
      const backup = backups.find((b) => b.filename === filename);

      if (backup?.path) {
        const resolvedPath = path.resolve(backup.path);
        const resolvedDir = path.resolve(this.backupDir);
        if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
          return { success: false, error: 'Invalid backup path' };
        }
        data = await fsp.readFile(backup.path);
      } else {
        data = await this.storage.get(filename);
      }

      logger.warn(`Restoring database from backup: ${filename}`);

      database.close();

      await fsp.writeFile(env.DATABASE_PATH, data);

      logger.info('Database restored successfully. Restart required.');

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Restore failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Start scheduled backup job
   */
  start(): void {
    if (this.task) {
      logger.warn('Backup service already running');
      return;
    }

    this.task = cron.schedule(
      env.BACKUP_CRON,
      async () => {
        await this.runBackup();
      },
      {
        timezone: env.TZ || 'UTC',
      }
    );

    logger.info(`Backup service started (schedule: ${env.BACKUP_CRON})`);
  }

  /**
   * Stop scheduled backup job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Backup service stopped');
    }
  }

  /**
   * Check if backup service is running
   */
  isRunning(): boolean {
    return this.task !== null;
  }

  /**
   * Format backup list for display
   */
  async formatBackupList(): Promise<string> {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return 'No backups found.';
    }

    const lines = backups.slice(0, 10).map((backup, index) => {
      const sizeKB = Math.round(backup.size / 1024);
      const date = backup.createdAt
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);
      const linkPart = backup.shareLink
        ? ` [View](${backup.shareLink})`
        : '';
      return `${index + 1}. \`${backup.filename}\` (${sizeKB} KB) - ${date}${linkPart}`;
    });

    if (backups.length > 10) {
      lines.push(`... and ${backups.length - 10} more`);
    }

    return lines.join('\n');
  }
}

export const backupService = new BackupService();
