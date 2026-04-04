import { resolve } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

vi.mock('../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

async function loadEnvModule(
  overrides: Record<string, string | undefined> = {}
): Promise<typeof import('../env.js')> {
  restoreEnv();
  Object.assign(process.env, {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    BOT_OWNER_IDS: '123456789012345678',
    NODE_ENV: 'development',
  });

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  vi.resetModules();
  return import('../env.ts');
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('env security validation', () => {
  it('rejects non-https alert webhooks', async () => {
    await expect(
      loadEnvModule({
        ALERT_WEBHOOK_URL: 'http://discord.com/api/webhooks/test/id',
      })
    ).rejects.toThrow('ALERT_WEBHOOK_URL is not a valid HTTPS URL');
  });

  it('rejects path traversal outside the workspace root', async () => {
    await expect(
      loadEnvModule({
        DATABASE_PATH: '../outside/bot.db',
      })
    ).rejects.toThrow('DATABASE_PATH must stay within the workspace root');
  });

  it('rejects absolute runtime directories', async () => {
    await expect(
      loadEnvModule({
        RECORDINGS_DIR: resolve('absolute-recordings'),
      })
    ).rejects.toThrow(
      'RECORDINGS_DIR must be a relative path inside the workspace'
    );
  });

  it('normalizes valid relative runtime paths', async () => {
    const { env } = await loadEnvModule({
      DATA_DIR: 'runtime-data',
      DATABASE_PATH: 'runtime-data/app.db',
      RECORDINGS_DIR: 'runtime-data/recordings',
      BACKUP_DIR: 'runtime-data/backups',
    });

    expect(env.DATA_DIR).toBe('runtime-data/');
    expect(env.DATABASE_PATH).toBe('runtime-data/app.db');
    expect(env.RECORDINGS_DIR).toBe('runtime-data/recordings/');
    expect(env.BACKUP_DIR).toBe('runtime-data/backups/');
  });
});
