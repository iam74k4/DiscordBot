import type { IBackupStorage } from './types.js';
import { LocalStorage } from './localStorage.js';

export type { IBackupStorage } from './types.js';
export { validateBackupFilename } from './types.js';

/**
 * Create backup storage instance
 *
 * @returns Local storage implementation
 */
export function createBackupStorage(): IBackupStorage {
  return new LocalStorage();
}
