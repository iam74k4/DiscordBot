import { createReadStream } from 'fs';
import { google } from 'googleapis';
import { env } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import { withRetry } from '../../../utils/retry.js';
import type { BackupFileInfo, IBackupStorage } from './types.js';
import { validateBackupFilename } from './types.js';

/**
 * Determine if a Google Drive API error is transient and should be retried.
 *
 * @param error - The error to evaluate
 * @returns `true` for network errors, 5xx, and 429 (rate limit)
 */
function shouldRetryDriveError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('socket') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('429') ||
      msg.includes('rate limit')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Google Drive storage for backups
 */
export class GoogleDriveStorage implements IBackupStorage {
  private readonly folderId: string;
  private drive: ReturnType<typeof google.drive> | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.folderId = env.GOOGLE_DRIVE_FOLDER_ID || 'root';
  }

  /**
   * Initialize the Drive API client (lazy, idempotent).
   * Resets `initPromise` on failure so subsequent calls can retry.
   */
  private async init(): Promise<void> {
    if (this.drive) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        let auth;
        const credentialsPath = env.GOOGLE_APPLICATION_CREDENTIALS;
        const serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON;

        if (serviceAccountJson) {
          const credentials = JSON.parse(
            Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
          );
          auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
          });
        } else if (credentialsPath) {
          auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
          });
        } else {
          throw new Error(
            'GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON must be set for Google Drive storage'
          );
        }

        const authClient = await auth.getClient();
        this.drive = google.drive({
          version: 'v3',
          auth: authClient as Parameters<typeof google.drive>[0]['auth'],
        });
      } catch (error) {
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Upload a backup file to Google Drive and create a public share permission.
   *
   * @param filename - Validated backup filename
   * @param localPath - Absolute path to the local file to upload
   * @throws Error if filename is invalid or upload fails
   */
  async put(filename: string, localPath: string): Promise<void> {
    if (!validateBackupFilename(filename)) {
      throw new Error('Invalid backup filename format');
    }
    await this.init();
    if (!this.drive) throw new Error('Drive not initialized');

    const parents = this.folderId === 'root' ? [] : [this.folderId];
    const requestBody: { name: string; parents?: string[] } = {
      name: filename,
    };
    if (parents.length > 0) {
      requestBody.parents = parents;
    }

    const res = await withRetry(
      () =>
        this.drive!.files.create({
          requestBody,
          media: {
            mimeType: 'application/x-sqlite3',
            body: createReadStream(localPath),
          },
        }),
      {
        maxRetries: 3,
        shouldRetry: shouldRetryDriveError,
        operationName: 'Google Drive upload',
      }
    );

    const fileId = res.data.id;
    if (!fileId) {
      throw new Error('Failed to get file ID from upload response');
    }

    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      logger.warn(
        'Failed to create share link (file uploaded successfully):',
        permError instanceof Error ? permError.message : permError
      );
    }
  }

  /**
   * Download a backup file from Google Drive.
   *
   * @param filename - Validated backup filename
   * @returns File contents as a Buffer
   * @throws Error if filename is invalid or file not found
   */
  async get(filename: string): Promise<Buffer> {
    if (!validateBackupFilename(filename)) {
      throw new Error('Invalid backup filename format');
    }
    await this.init();
    if (!this.drive) throw new Error('Drive not initialized');

    return withRetry(
      async () => {
        const fileId = await this.getFileId(filename);
        if (!fileId) {
          throw new Error(`File not found: ${filename}`);
        }
        const response = await this.drive!.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        return Buffer.from(response.data as ArrayBuffer);
      },
      {
        maxRetries: 3,
        shouldRetry: shouldRetryDriveError,
        operationName: 'Google Drive download',
      }
    );
  }

  /**
   * List all backup files in the configured Google Drive folder.
   *
   * @returns Array of backup file info sorted by createdTime descending
   */
  async list(): Promise<BackupFileInfo[]> {
    await this.init();
    if (!this.drive) throw new Error('Drive not initialized');

    const parentQuery =
      this.folderId === 'root'
        ? "'root' in parents"
        : `'${this.folderId}' in parents`;

    const q = `${parentQuery} and name contains 'backup-' and name contains '.db' and trashed=false`;

    const res = await withRetry(
      () =>
        this.drive!.files.list({
          q,
          fields: 'files(id,name,size,createdTime,webViewLink,webContentLink)',
          orderBy: 'createdTime desc',
        }),
      {
        maxRetries: 3,
        shouldRetry: shouldRetryDriveError,
        operationName: 'Google Drive list',
      }
    );

    const files = res.data.files || [];
    const backups: BackupFileInfo[] = files
      .filter((f) => f.name?.startsWith('backup-') && f.name?.endsWith('.db'))
      .map((f) => ({
        filename: f.name!,
        size: Number(f.size) || 0,
        createdAt: f.createdTime ? new Date(f.createdTime) : new Date(0),
        shareLink: f.webViewLink || f.webContentLink || undefined,
      }));

    return backups;
  }

  /**
   * Delete a backup file from Google Drive.
   * Logs a warning and returns silently if the file is not found.
   *
   * @param filename - Validated backup filename
   * @throws Error if filename is invalid or API call fails
   */
  async delete(filename: string): Promise<void> {
    if (!validateBackupFilename(filename)) {
      throw new Error('Invalid backup filename format');
    }
    await this.init();
    if (!this.drive) throw new Error('Drive not initialized');

    await withRetry(
      async () => {
        const fileId = await this.getFileId(filename);
        if (!fileId) {
          logger.warn(`Cannot delete: file not found: ${filename}`);
          return;
        }
        await this.drive!.files.delete({ fileId });
      },
      {
        maxRetries: 3,
        shouldRetry: shouldRetryDriveError,
        operationName: 'Google Drive delete',
      }
    );
  }

  /**
   * Get the shareable link for a backup file.
   *
   * @param filename - Backup filename to look up
   * @returns Share URL, or `null` if not found
   */
  async getShareLink(filename: string): Promise<string | null> {
    const backups = await this.list();
    const backup = backups.find((b) => b.filename === filename);
    return backup?.shareLink ?? null;
  }

  /**
   * Find a file's Google Drive ID by its filename.
   *
   * @param filename - Exact filename to search for
   * @returns Google Drive file ID, or `null` if not found
   */
  private async getFileId(filename: string): Promise<string | null> {
    if (!this.drive) return null;

    const parentQuery =
      this.folderId === 'root'
        ? "'root' in parents"
        : `'${this.folderId}' in parents`;

    const escapedName = filename.replace(/'/g, "''");
    const q = `${parentQuery} and name='${escapedName}' and trashed=false`;

    const res = await this.drive.files.list({
      q,
      fields: 'files(id)',
      pageSize: 1,
    });

    const files = res.data.files || [];
    return files[0]?.id || null;
  }
}
