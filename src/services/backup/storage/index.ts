import { env } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import type { IBackupStorage } from './types.js';
import { LocalStorage } from './localStorage.js';
import { GoogleDriveStorage } from './googleDriveStorage.js';

export type { BackupFileInfo, IBackupStorage } from './types.js';
export { validateBackupFilename } from './types.js';
export { LocalStorage } from './localStorage.js';
export { GoogleDriveStorage } from './googleDriveStorage.js';

/** Supported storage types */
const VALID_STORAGE_TYPES = ['local', 'google_drive'] as const;

/**
 * Create storage instance based on BACKUP_STORAGE_TYPE
 *
 * @returns Storage implementation matching the configured type
 */
export function createBackupStorage(): IBackupStorage {
  const type = env.BACKUP_STORAGE_TYPE;

  switch (type) {
    case 'google_drive':
      return new GoogleDriveStorage();
    case 'local':
      return new LocalStorage();
    default:
      logger.warn(
        `Unknown BACKUP_STORAGE_TYPE "${type}", falling back to local. Supported: ${VALID_STORAGE_TYPES.join(', ')}`
      );
      return new LocalStorage();
  }
}
