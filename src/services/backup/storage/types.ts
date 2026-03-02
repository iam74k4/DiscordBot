/** Backup filename format (prevents path traversal) */
const BACKUP_FILENAME_REGEX = /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/;

/**
 * Validate backup filename to prevent path traversal and injection
 */
export function validateBackupFilename(filename: string): boolean {
  return BACKUP_FILENAME_REGEX.test(filename);
}

/**
 * Backup file information (storage-agnostic)
 */
export interface BackupFileInfo {
  filename: string;
  size: number;
  createdAt: Date;
  shareLink?: string;
  /** Local path (only for LocalStorage) */
  path?: string;
}

/**
 * Storage interface for backup files
 */
export interface IBackupStorage {
  put(filename: string, localPath: string): Promise<void>;
  get(filename: string): Promise<Buffer>;
  list(): Promise<BackupFileInfo[]>;
  delete(filename: string): Promise<void>;
  getShareLink(filename: string): Promise<string | null>;
}
