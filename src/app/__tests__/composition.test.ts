import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../config/index.js';
import { createApp, type AppDependencies } from '../composition.js';

vi.mock('../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

/**
 * The bootstrap is only correct if things happen in the right order: the
 * database before anything queries it, features after the gateway is ready,
 * the final backup before the connection closes. That order used to live in a
 * script nothing could execute; here it is driven end to end with fakes.
 */
function harness(overrides: Partial<AppDependencies> = {}) {
  const order: string[] = [];
  const record =
    <T>(name: string, result?: T) =>
    () => {
      order.push(name);
      return result as T;
    };

  const client = {
    destroy: vi.fn(() => order.push('client.destroy')),
    on: vi.fn(),
  };

  const deps: AppDependencies = {
    createClient: () => client as never,
    initializeDatabase: async () => void order.push('initializeDatabase'),
    closeDatabase: record('closeDatabase'),
    loadFeatures: async () => void order.push('loadFeatures'),
    loadCommands: async () => void order.push('loadCommands'),
    loadEvents: async () => void order.push('loadEvents'),
    startAllFeatures: async () => void order.push('startAllFeatures'),
    stopAllFeatures: async () => void order.push('stopAllFeatures'),
    login: async () => void order.push('login'),
    awaitReady: async () => void order.push('awaitReady'),
    backup: {
      start: record('backup.start'),
      stop: record('backup.stop'),
      runBackup: async () => {
        order.push('backup.runBackup');
        return { success: true };
      },
    },
    startAuditRetention: record('startAuditRetention'),
    stopAuditRetention: record('stopAuditRetention'),
    clearCooldowns: record('clearCooldowns'),
    ...overrides,
  };

  return { order, client, deps };
}

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    DISCORD_TOKEN: 'token',
    SHUTDOWN_FINAL_BACKUP: true,
    ...overrides,
  } as AppConfig;
}

describe('composition root', () => {
  it('assembles the bot in dependency order', async () => {
    const { order, deps } = harness();

    await createApp(config(), deps).start();

    expect(order).toEqual([
      'initializeDatabase',
      'loadFeatures',
      'loadCommands',
      'loadEvents',
      'login',
      'awaitReady',
      'startAllFeatures',
      'backup.start',
      'startAuditRetention',
    ]);
  });

  it('hands features the client and the configuration it was built with', async () => {
    const startAllFeatures = vi.fn().mockResolvedValue(undefined);
    const { client, deps } = harness({ startAllFeatures });
    const appConfig = config();

    await createApp(appConfig, deps).start();

    expect(startAllFeatures).toHaveBeenCalledWith({
      client,
      config: appConfig,
    });
  });

  it('takes the final backup before closing the database', async () => {
    const { order, deps } = harness();

    await createApp(config(), deps).stop();

    expect(order).toEqual([
      'backup.runBackup',
      'backup.stop',
      'stopAuditRetention',
      'stopAllFeatures',
      'clearCooldowns',
      'closeDatabase',
      'client.destroy',
    ]);
  });

  it('skips the final backup when it is turned off', async () => {
    const { order, deps } = harness();

    await createApp(config({ SHUTDOWN_FINAL_BACKUP: false }), deps).stop();

    expect(order).not.toContain('backup.runBackup');
    expect(order[0]).toBe('backup.stop');
  });

  it('still closes the database when an earlier step throws', async () => {
    const { order, deps } = harness({
      stopAllFeatures: vi.fn().mockRejectedValue(new Error('feature hung')),
    });

    await expect(createApp(config(), deps).stop()).resolves.toBeUndefined();

    expect(order).toContain('closeDatabase');
    expect(order).toContain('client.destroy');
  });

  it('logs in with the token it was configured with', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const { client, deps } = harness({ login });

    await createApp(config({ DISCORD_TOKEN: 'secret-token' }), deps).start();

    expect(login).toHaveBeenCalledWith(client, 'secret-token');
  });
});
