import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorage } from '../../../services/backup/storage/localStorage.js';
import { validateBackupFilename } from '../../../services/backup/storage/types.js';

vi.mock('../../../config/index.js', () => ({
  env: {
    BACKUP_DIR: 'test-backups',
  },
}));

describe('LocalStorage', () => {
  const testBackupDir = 'test-backups';

  beforeEach(() => {
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true });
    }
    fs.mkdirSync(testBackupDir, { recursive: true });
  });

  describe('validateBackupFilename', () => {
    it('should accept valid backup filenames', () => {
      expect(validateBackupFilename('backup-2024-01-01T00-00-00.db')).toBe(
        true
      );
      expect(validateBackupFilename('backup-2030-12-31T23-59-59.db')).toBe(
        true
      );
    });

    it('should reject path traversal attempts', () => {
      expect(validateBackupFilename('../etc/passwd')).toBe(false);
      expect(validateBackupFilename('backup-2024-01-01T00-00-00.db/../../../x')).toBe(
        false
      );
      expect(validateBackupFilename('..\\..\\etc\\passwd')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validateBackupFilename('backup.db')).toBe(false);
      expect(validateBackupFilename('backup-2024-01-01.db')).toBe(false);
      expect(validateBackupFilename('')).toBe(false);
    });
  });

  describe('get', () => {
    it('should reject invalid filename', async () => {
      const storage = new LocalStorage();
      await expect(storage.get('../etc/passwd')).rejects.toThrow(
        'Invalid backup filename format'
      );
    });

    it('should return file contents for valid filename', async () => {
      const validFile = path.join(testBackupDir, 'backup-2024-01-01T00-00-00.db');
      fs.writeFileSync(validFile, 'test content');

      const storage = new LocalStorage();
      const data = await storage.get('backup-2024-01-01T00-00-00.db');

      expect(data.toString()).toBe('test content');
    });
  });

  describe('delete', () => {
    it('should reject invalid filename', async () => {
      const storage = new LocalStorage();
      await expect(storage.delete('../etc/passwd')).rejects.toThrow(
        'Invalid backup filename format'
      );
    });
  });
});
