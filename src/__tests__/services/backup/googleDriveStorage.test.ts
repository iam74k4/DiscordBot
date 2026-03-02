import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Readable } from 'stream';

const mockFilesCreate = vi.fn();

vi.mock('fs', () => ({
  createReadStream: vi.fn(() => Readable.from(Buffer.from('test'))),
}));
const mockFilesList = vi.fn();
const mockFilesGet = vi.fn();
const mockFilesDelete = vi.fn();
const mockPermissionsCreate = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: class MockGoogleAuth {
        getClient = vi.fn().mockResolvedValue({});
      },
    },
    drive: vi.fn(function () {
      return {
        files: {
          create: mockFilesCreate,
          list: mockFilesList,
          get: mockFilesGet,
          delete: mockFilesDelete,
        },
        permissions: {
          create: mockPermissionsCreate,
        },
      };
    }),
  },
}));

vi.mock('../../../utils/retry.js', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    BACKUP_STORAGE_TYPE: 'google_drive',
    GOOGLE_DRIVE_FOLDER_ID: 'test-folder-id',
    GOOGLE_SERVICE_ACCOUNT_JSON: Buffer.from(
      JSON.stringify({
        type: 'service_account',
        project_id: 'test',
        private_key_id: 'test',
        private_key:
          '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        client_email: 'test@test.iam.gserviceaccount.com',
        client_id: '123',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      })
    ).toString('base64'),
  },
}));

describe('GoogleDriveStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilesCreate.mockResolvedValue({ data: { id: 'file-123' } });
    mockPermissionsCreate.mockResolvedValue({});
    mockFilesList.mockResolvedValue({
      data: {
        files: [
          {
            id: 'file-123',
            name: 'backup-2024-01-01T00-00-00.db',
            size: '1234',
            createdTime: '2024-01-01T00:00:00.000Z',
            webViewLink: 'https://drive.google.com/view/123',
          },
        ],
      },
    });
    mockFilesGet.mockImplementation(
      (_params: { fileId: string; alt?: string }) => {
        if (_params.alt === 'media') {
          return Promise.resolve({ data: Buffer.from('test content') });
        }
        return Promise.resolve({
          data: {
            id: _params.fileId,
            name: 'backup-2024-01-01T00-00-00.db',
            webViewLink: 'https://drive.google.com/view/123',
          },
        });
      }
    );
    mockFilesDelete.mockResolvedValue({});
  });

  describe('put', () => {
    it('should upload file and create share permission', async () => {
      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await storage.put('backup-2024-01-01T00-00-00.db', '/tmp/test.db');

      expect(mockFilesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            name: 'backup-2024-01-01T00-00-00.db',
            parents: ['test-folder-id'],
          }),
        })
      );
      expect(mockPermissionsCreate).toHaveBeenCalledWith({
        fileId: 'file-123',
        requestBody: { role: 'reader', type: 'anyone' },
      });
    });

    it('should reject invalid filename', async () => {
      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await expect(
        storage.put('../etc/passwd', '/tmp/test.db')
      ).rejects.toThrow('Invalid backup filename format');
    });

    it('should throw on upload failure', async () => {
      mockFilesCreate.mockRejectedValueOnce(new Error('Upload failed'));

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await expect(
        storage.put('backup-2024-01-01T00-00-00.db', '/tmp/test.db')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('list', () => {
    it('should list backup files', async () => {
      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      const list = await storage.list();

      expect(list).toHaveLength(1);
      expect(list[0].filename).toBe('backup-2024-01-01T00-00-00.db');
      expect(list[0].size).toBe(1234);
      expect(list[0].shareLink).toBe('https://drive.google.com/view/123');
    });

    it('should return empty array when no files exist', async () => {
      mockFilesList.mockResolvedValueOnce({ data: { files: [] } });

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      const list = await storage.list();

      expect(list).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('should get file contents', async () => {
      mockFilesList.mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-123', name: 'backup-2024-01-01T00-00-00.db' }],
        },
      });

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      const data = await storage.get('backup-2024-01-01T00-00-00.db');

      expect(Buffer.isBuffer(data)).toBe(true);
      expect(data.toString()).toBe('test content');
    });

    it('should reject invalid filename', async () => {
      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await expect(storage.get('../etc/passwd')).rejects.toThrow(
        'Invalid backup filename format'
      );
    });

    it('should throw when file not found', async () => {
      mockFilesList.mockResolvedValueOnce({ data: { files: [] } });

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await expect(
        storage.get('backup-2024-01-01T00-00-00.db')
      ).rejects.toThrow('File not found');
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      mockFilesList.mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-123', name: 'backup-2024-01-01T00-00-00.db' }],
        },
      });

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await storage.delete('backup-2024-01-01T00-00-00.db');

      expect(mockFilesDelete).toHaveBeenCalledWith({ fileId: 'file-123' });
    });

    it('should reject invalid filename', async () => {
      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await expect(storage.delete('../etc/passwd')).rejects.toThrow(
        'Invalid backup filename format'
      );
    });

    it('should warn and not throw when file not found', async () => {
      const { logger } = await import('../../../utils/logger.js');
      mockFilesList.mockResolvedValueOnce({ data: { files: [] } });

      const { GoogleDriveStorage } =
        await import('../../../services/backup/storage/googleDriveStorage.js');
      const storage = new GoogleDriveStorage();

      await storage.delete('backup-2024-01-01T00-00-00.db');

      expect(mockFilesDelete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('file not found')
      );
    });
  });
});
