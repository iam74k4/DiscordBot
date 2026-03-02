import { createReadStream } from 'fs';
import { google } from 'googleapis';
import { env } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import { withRetry } from '../../../utils/retry.js';
import type { BackupFileInfo, IBackupStorage } from './types.js';
import { validateBackupFilename } from './types.js';

/** Retry Google Drive API calls on transient failures (network, 5xx, 429) */
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
   * Initialize Drive API client
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
   * Upload file to Google Drive
   */
  async put(filename: string, localPath: string): Promise<void> {
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
   * Get file contents from Google Drive
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
   * List backup files in Google Drive
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
        size: parseInt(f.size || '0', 10),
        createdAt: f.createdTime ? new Date(f.createdTime) : new Date(0),
        shareLink: f.webViewLink || f.webContentLink || undefined,
      }));

    return backups;
  }

  /**
   * Delete file from Google Drive
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
   * Get share link for a file
   */
  async getShareLink(filename: string): Promise<string | null> {
    const backups = await this.list();
    const backup = backups.find((b) => b.filename === filename);
    return backup?.shareLink ?? null;
  }

  /**
   * Find file ID by filename
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
