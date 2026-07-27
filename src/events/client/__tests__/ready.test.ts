import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtendedClient } from '../../../client.js';

const registerCommands = vi.fn();
const loggerInfo = vi.fn();
const loggerError = vi.fn();

vi.mock('../../../handlers/commandHandler.js', () => ({
  registerCommands,
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
  logger: {
    info: loggerInfo,
    error: loggerError,
  },
}));

function createReadyClient(): ExtendedClient {
  return {
    user: {
      tag: 'TestBot#0000',
      setPresence: vi.fn(),
    },
    guilds: {
      cache: {
        size: 2,
      },
    },
    isFullyReady: false,
  } as unknown as ExtendedClient;
}

describe('ready event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the client ready before registering commands', async () => {
    const { event } = await import('../ready.js');
    const client = createReadyClient();

    registerCommands.mockImplementationOnce(async () => {
      expect(client.isFullyReady).toBe(true);
    });

    await event.execute(client);

    expect(registerCommands).toHaveBeenCalledWith(client);
    expect(client.isFullyReady).toBe(true);
  });

  it('keeps runtime interactions enabled when command registration fails', async () => {
    const { event } = await import('../ready.js');
    const client = createReadyClient();

    registerCommands.mockRejectedValueOnce(new Error('REST unavailable'));

    await expect(event.execute(client)).resolves.toBeUndefined();

    expect(client.isFullyReady).toBe(true);
    expect(loggerError).toHaveBeenCalledWith(
      'Slash command registration failed; continuing with loaded command handlers:',
      'REST unavailable'
    );
  });
});
