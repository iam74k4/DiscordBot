import { describe, expect, it, vi, beforeEach } from 'vitest';

const getByDiscordIds = vi.fn();
const getPlayerSummaries = vi.fn();
const getTotalPlaytime = vi.fn();
const sendPaginatedMessage = vi.fn();
const withTimeout = vi.fn(async (promise: Promise<unknown>) => promise);

vi.mock('../../repositories/index.js', () => ({
  steamUserRepository: {
    getByDiscordIds,
  },
}));

vi.mock('../../integrations/steam/index.js', () => ({
  steamClient: {
    getPlayerSummaries,
    getTotalPlaytime,
    getFormattedPlayerInfo: vi.fn(),
  },
  formatPlaytimeWithBar: vi.fn(() => 'bar'),
}));

vi.mock('../../../../shared/utils/pagination.js', () => ({
  sendPaginatedMessage,
}));

vi.mock('../../../../shared/utils/timeout.js', () => ({
  withTimeout,
}));

describe('steam ranking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses batched player summaries before rendering the ranking', async () => {
    getByDiscordIds.mockReturnValue([
      { discord_id: 'user-1', steam_id: 'steam-1', steam_name: 'Alice' },
      { discord_id: 'user-2', steam_id: 'steam-2', steam_name: 'Bob' },
    ]);
    getPlayerSummaries.mockResolvedValue([
      { steamid: 'steam-1', personaname: 'Alice Summary' },
      { steamid: 'steam-2', personaname: 'Bob Summary' },
    ]);
    getTotalPlaytime.mockResolvedValueOnce(240).mockResolvedValueOnce(120);

    const membersCache = {
      size: 2,
      map: vi.fn(() => ['user-1', 'user-2']),
      has: vi.fn((id: string) => id === 'user-1' || id === 'user-2'),
    };
    const guild = {
      name: 'Test Guild',
      memberCount: 2,
      members: {
        cache: membersCache,
        fetch: vi.fn(),
      },
    };
    const interaction = {
      guild,
      locale: 'en-US',
      deferReply: vi.fn(),
      editReply: vi.fn(),
    } as never;

    const { handleRanking } = await import('../../application/ranking.js');
    await handleRanking(interaction);

    expect(getPlayerSummaries).toHaveBeenCalledWith(['steam-1', 'steam-2']);
    expect(getTotalPlaytime).toHaveBeenCalledTimes(2);
    expect(sendPaginatedMessage).toHaveBeenCalledTimes(1);

    const payload = sendPaginatedMessage.mock.calls[0][0];
    expect(payload.items).toEqual([
      {
        discordId: 'user-1',
        steamName: 'Alice Summary',
        totalPlaytime: 240,
      },
      {
        discordId: 'user-2',
        steamName: 'Bob Summary',
        totalPlaytime: 120,
      },
    ]);
  });
});
