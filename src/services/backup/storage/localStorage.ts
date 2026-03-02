import * as fsp from 'fs/promises';
import * as path from 'path';
import { env } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import type { BackupFileInfo, IBackupStorage } from './types.js';
import { validateBackupFilename } from './types.js';

/**
 * Local filesystem storage for backups
 */
export class LocalStorage implements IBackupStorage {
  private readonly backupDir: string;

  constructor() {
    this.backupDir = env.BACKUP_DIR;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureDir(): Promise<void> {
    try {
      await fsp.mkdir(this.backupDir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Put file - no-op for local storage (file is already written by database.backup)
   */
  async put(_filename: string, _localPath: string): Promise<void> {
    // File is already at localPath; no action needed
  }

  /**
   * Get file contents
   */
  async get(filename: string): Promise<Buffer> {
    if (!validateBackupFilename(filename)) {
      throw new Error('Invalid backup filename format');
    }
    const filePath = path.join(this.backupDir, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(this.backupDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      throw new Error('Invalid backup path');
    }
    return fsp.readFile(filePath);
  }

  /**
   * List all backup files
   */
  async list(): Promise<BackupFileInfo[]> {
    await this.ensureDir();

    try {
      const files = await fsp.readdir(this.backupDir);
      const backups: BackupFileInfo[] = [];

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.db')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fsp.stat(filePath);

          backups.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            path: filePath,
          });
        }
      }

      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete a backup file
   */
  async delete(filename: string): Promise<void> {
    if (!validateBackupFilename(filename)) {
      throw new Error('Invalid backup filename format');
    }
    const filePath = path.join(this.backupDir, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(this.backupDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      throw new Error('Invalid backup path');
    }
    await fsp.unlink(filePath);
  }

  /**
   * Get share link - not supported for local storage
   */
  async getShareLink(_filename: string): Promise<string | null> {
    return null;
  }
}
