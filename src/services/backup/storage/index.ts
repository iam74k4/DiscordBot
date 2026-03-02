import { env } from '../../../config/index.js';
import type { IBackupStorage } from './types.js';
import { LocalStorage } from './localStorage.js';
import { GoogleDriveStorage } from './googleDriveStorage.js';

export type { BackupFileInfo, IBackupStorage } from './types.js';
export { validateBackupFilename } from './types.js';
export { LocalStorage } from './localStorage.js';
export { GoogleDriveStorage } from './googleDriveStorage.js';

/**
 * Create storage instance based on BACKUP_STORAGE_TYPE
 */
export function createBackupStorage(): IBackupStorage {
  const type = env.BACKUP_STORAGE_TYPE;

  switch (type) {
    case 'google_drive':
      return new GoogleDriveStorage();
    case 'local':
    default:
      return new LocalStorage();
  }
}
