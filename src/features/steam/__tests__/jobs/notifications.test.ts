import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getEnabledGuilds = vi.fn();
const getNotifiableUsers = vi.fn();
const getGameActivityCache = vi.fn();
const updateGameActivityCache = vi.fn();
const getPlayerSummaries = vi.fn();
const getSendableTextChannel = vi.fn();
const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../../repositories/index.js', () => ({
  steamNotificationRepository: {
    getEnabledGuilds,
    getNotifiableUsers,
    getGameActivityCache,
    updateGameActivityCache,
  },
  steamUserRepository: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../integrations/steam/index.js', () => ({
  steamClient: {
    getPlayerSummaries,
    isConfigured: vi.fn(() => true),
  },
}));

vi.mock('../../../../shared/utils/discord.js', () => ({
  getSendableTextChannel,
}));

vi.mock('../../../../shared/utils/logger.js', () => ({ logger }));

describe('steam notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends notifications using notifiable users and omits steam id footer', async () => {
    const send = vi.fn();

    getNotifiableUsers.mockReturnValue([
      {
        discord_id: 'user-1',
        steam_id: 'steam-1',
        steam_name: 'Alice',
        registered_at: Date.now(),
      },
    ]);
    getPlayerSummaries.mockResolvedValue([
      {
        steamid: 'steam-1',
        personaname: 'Alice',
        avatarfull: 'https://example.com/avatar.png',
        gameextrainfo: 'Portal 2',
      },
    ]);
    getGameActivityCache.mockReturnValue(null);
    getEnabledGuilds.mockReturnValue([
      { guild_id: 'guild-1', channel_id: 'channel-1', enabled: 1 },
    ]);
    getSendableTextChannel.mockResolvedValue({ send });

    const guild = {
      id: 'guild-1',
      members: {
        fetch: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
        cache: [],
      },
    };
    const client = {
      guilds: {
        cache: new Map([['guild-1', guild]]),
      },
    } as never;

    const {
      startNotificationSystem,
      stopNotificationSystem,
      triggerNotificationCheck,
    } = await import('../../jobs/notifications/index.js');

    startNotificationSystem(client);
    await triggerNotificationCheck();
    stopNotificationSystem();

    expect(getNotifiableUsers).toHaveBeenCalledTimes(1);
    expect(getPlayerSummaries).toHaveBeenCalledWith(
      ['steam-1'],
      expect.any(AbortSignal)
    );
    expect(updateGameActivityCache).toHaveBeenCalledWith(
      'user-1',
      'Portal 2',
      expect.any(Number)
    );
    expect(send).toHaveBeenCalledTimes(1);

    const payload = send.mock.calls[0][0];
    expect(payload.content).toBe('<@user-1>');
    expect(payload.embeds[0].data.footer).toBeUndefined();
  });
});
