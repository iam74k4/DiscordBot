import { describe, it, expect, vi } from 'vitest';

vi.mock('../../integrations/steam/index.js', () => ({
  steamClient: {
    getFormattedPlayerInfo: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../application/dashboard.js', () => ({
  showSteamProfileDashboard: vi.fn(),
}));

describe('Steam profile', () => {
  it('handleProfile is a function', async () => {
    const profile = await import('../../application/profile.js');
    expect(typeof profile.handleProfile).toBe('function');
  });
});
