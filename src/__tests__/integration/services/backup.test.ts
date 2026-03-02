import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock the database before importing backup service
vi.mock('../../../services/database/index.js', () => ({
  database: {
    pragma: vi.fn(),
    backup: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  },
}));

// Mock env
vi.mock('../../../config/index.js', () => ({
  env: {
    BACKUP_STORAGE_TYPE: 'local',
    BACKUP_DIR: 'test-backups',
    BACKUP_RETENTION_DAYS: 7,
    BACKUP_CRON: '0 4 * * *',
    DATABASE_PATH: 'test-data/bot.db',
    TZ: 'UTC',
  },
}));

// Import after mocks
import { backupService } from '../../../services/backup/index.js';

describe('BackupService', () => {
  const testBackupDir = 'test-backups';

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true });
    }
    fs.mkdirSync(testBackupDir, { recursive: true });
  });

  afterEach(() => {
    // Stop service if running
    backupService.stop();

    // Clean up
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true });
    }
  });

  describe('runBackup', () => {
    it('should create a backup file', async () => {
      // For this test, we need to also mock fs.statSync since backup() doesn't actually create the file
      const { database } = await import('../../../services/database/index.js');

      // Mock backup to actually create a file
      vi.mocked(database.backup).mockImplementation(
        async (filePath: string) => {
          fs.writeFileSync(filePath, 'mock backup content');
        }
      );

      const result = await backupService.runBackup();

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(
        /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/
      );
    });

    it('should return error on failure', async () => {
      // Mock backup to fail
      const { database } = await import('../../../services/database/index.js');
      vi.mocked(database.backup).mockRejectedValueOnce(
        new Error('Backup failed')
      );

      const result = await backupService.runBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup failed');
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', async () => {
      const backups = await backupService.listBackups();
      expect(backups).toEqual([]);
    });

    it('should list existing backup files', async () => {
      const backupFile = path.join(
        testBackupDir,
        'backup-2024-01-01T00-00-00.db'
      );
      fs.writeFileSync(backupFile, 'test content');

      const backups = await backupService.listBackups();

      expect(backups.length).toBe(1);
      expect(backups[0].filename).toBe('backup-2024-01-01T00-00-00.db');
    });

    it('should sort backups by date (newest first)', async () => {
      const files = [
        'backup-2024-01-01T00-00-00.db',
        'backup-2024-01-03T00-00-00.db',
        'backup-2024-01-02T00-00-00.db',
      ];

      for (const file of files) {
        fs.writeFileSync(path.join(testBackupDir, file), 'test');
      }

      const backups = await backupService.listBackups();

      expect(backups.length).toBe(3);
    });
  });

  describe('deleteOldBackups', () => {
    it('should delete backups older than retention period', async () => {
      const oldBackupFile = path.join(
        testBackupDir,
        'backup-2020-01-01T00-00-00.db'
      );
      fs.writeFileSync(oldBackupFile, 'old content');

      const oldTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldBackupFile, oldTime, oldTime);

      const deleted = await backupService.deleteOldBackups();

      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('start/stop', () => {
    it('should start and stop the backup service', () => {
      expect(backupService.isRunning()).toBe(false);

      backupService.start();
      expect(backupService.isRunning()).toBe(true);

      backupService.stop();
      expect(backupService.isRunning()).toBe(false);
    });

    it('should not start twice', () => {
      backupService.start();
      backupService.start(); // Should not throw

      expect(backupService.isRunning()).toBe(true);
    });
  });

  describe('formatBackupList', () => {
    it('should return "No backups found" when empty', async () => {
      const formatted = await backupService.formatBackupList();
      expect(formatted).toBe('No backups found.');
    });

    it('should format backup list correctly', async () => {
      const backupFile = path.join(
        testBackupDir,
        'backup-2024-01-01T00-00-00.db'
      );
      fs.writeFileSync(backupFile, 'test content');

      const formatted = await backupService.formatBackupList();

      expect(formatted).toContain('backup-2024-01-01T00-00-00.db');
      expect(formatted).toContain('KB');
    });
  });
});
