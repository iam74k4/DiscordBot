import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { env } from '../../config/index.js';
import { database } from '../database/index.js';
import { logger } from '../../utils/logger.js';

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
  path: string;
  size: number;
  createdAt: Date;
}

/**
 * Backup service for database backups
 */
class BackupService {
  private task: cron.ScheduledTask | null = null;
  private backupDir: string;

  constructor() {
    this.backupDir = env.BACKUP_DIR;
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.debug(`Created backup directory: ${this.backupDir}`);
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
    const filename = this.generateFilename();
    const backupPath = path.join(this.backupDir, filename);

    try {
      logger.info('Starting database backup...');

      // Checkpoint WAL to ensure all changes are written to main database
      try {
        database.pragma('wal_checkpoint(TRUNCATE)');
        logger.debug('WAL checkpoint completed');
      } catch (walError) {
        logger.warn('WAL checkpoint failed (non-fatal):', walError);
      }

      // Use SQLite backup API
      await database.backup(backupPath);

      // Get file size
      const stats = fs.statSync(backupPath);

      logger.info(
        `Backup completed: ${filename} (${Math.round(stats.size / 1024)} KB)`
      );

      // Clean up old backups
      const deleted = this.deleteOldBackups();
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
  listBackups(): BackupInfo[] {
    this.ensureBackupDir();

    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.db')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          backups.push({
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
      }

      // Sort by creation date (newest first)
      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete backups older than retention period
   */
  deleteOldBackups(): number {
    const retentionMs = env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    let deleted = 0;

    const backups = this.listBackups();

    for (const backup of backups) {
      if (backup.createdAt < cutoffDate) {
        try {
          fs.unlinkSync(backup.path);
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
    const backupPath = path.join(this.backupDir, filename);

    // Validate backup file exists
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    // Validate filename format for security
    if (!filename.match(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/)) {
      return { success: false, error: 'Invalid backup filename format' };
    }

    try {
      logger.warn(`Restoring database from backup: ${filename}`);

      // Close current database connection
      database.close();

      // Copy backup to database path
      fs.copyFileSync(backupPath, env.DATABASE_PATH);

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
  formatBackupList(): string {
    const backups = this.listBackups();

    if (backups.length === 0) {
      return 'No backups found.';
    }

    const lines = backups.slice(0, 10).map((backup, index) => {
      const sizeKB = Math.round(backup.size / 1024);
      const date = backup.createdAt
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);
      return `${index + 1}. \`${backup.filename}\` (${sizeKB} KB) - ${date}`;
    });

    if (backups.length > 10) {
      lines.push(`... and ${backups.length - 10} more`);
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const backupService = new BackupService();
