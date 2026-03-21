import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../integrations/steam/index.js', () => ({
  steamClient: {
    getFormattedGames: vi.fn().mockResolvedValue([]),
    getFormattedPlayerInfo: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../repositories/index.js', () => ({
  steamUserRepository: {
    getSteamId: vi.fn(() => null),
    getByDiscordIds: vi.fn(() => []),
  },
}));

describe('Steam dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showSteamProfileDashboard is a function', async () => {
    const dashboard = await import('../../application/dashboard.js');
    expect(typeof dashboard.showSteamProfileDashboard).toBe('function');
  });
});
