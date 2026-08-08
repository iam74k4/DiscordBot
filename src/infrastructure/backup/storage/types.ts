/**
 * Backup filename format:
 * - legacy: backup-YYYY-MM-DDTHH-MM-SS.db
 * - unique: backup-YYYY-MM-DDTHH-MM-SS-<6 hex>.db
 */
const BACKUP_FILENAME_REGEX =
  /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-[0-9a-f]{6})?\.db$/;

/**
 * Validate backup filename to prevent path traversal and injection.
 *
 * @param filename - Filename to validate
 * @returns `true` if the filename matches the expected backup format
 */
export function validateBackupFilename(filename: string): boolean {
  return BACKUP_FILENAME_REGEX.test(filename);
}

/**
 * Backup file information
 */
export interface BackupFileInfo {
  filename: string;
  size: number;
  createdAt: Date;
  /** Local path */
  path?: string;
}

/**
 * Storage interface for backup files.
 * Implementations must handle their own authentication and connection lifecycle.
 */
export interface IBackupStorage {
  /**
   * Upload a backup file to storage.
   * @param filename - Validated backup filename
   * @param localPath - Absolute path to the local file
   * @throws Error if filename is invalid or upload fails
   */
  put(filename: string, localPath: string): Promise<void>;

  /**
   * Download a backup file from storage.
   * @param filename - Validated backup filename
   * @returns File contents as a Buffer
   * @throws Error if filename is invalid or file not found
   */
  get(filename: string): Promise<Buffer>;

  /**
   * List all backup files in storage.
   * @returns Array of backup file information, sorted by createdAt descending
   */
  list(): Promise<BackupFileInfo[]>;

  /**
   * Delete a backup file from storage.
   * @param filename - Validated backup filename
   * @throws Error if filename is invalid or deletion fails
   */
  delete(filename: string): Promise<void>;
}
