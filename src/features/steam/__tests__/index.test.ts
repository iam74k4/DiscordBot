import { beforeEach, describe, expect, it, vi } from 'vitest';

const startScheduler = vi.fn();
const stopScheduler = vi.fn();
const startNotificationSystem = vi.fn();
const stopNotificationSystem = vi.fn();
const setServiceStatus = vi.fn();

vi.mock('../jobs/scheduler/index.js', () => ({
  startScheduler,
  stopScheduler,
}));

vi.mock('../jobs/notifications/index.js', () => ({
  startNotificationSystem,
  stopNotificationSystem,
}));

vi.mock('../integrations/steam/index.js', () => ({
  steamClient: {},
}));

vi.mock('../../../infrastructure/health/index.js', () => ({
  setServiceStatus,
}));

describe('steam feature lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('starts and stops only once across duplicate calls', async () => {
    const { start, stop } = await import('../index.js');
    const client = {} as never;

    start(client);
    start(client);

    expect(startScheduler).toHaveBeenCalledTimes(1);
    expect(startNotificationSystem).toHaveBeenCalledTimes(1);
    expect(setServiceStatus).toHaveBeenNthCalledWith(1, 'steamScheduler', true);
    expect(setServiceStatus).toHaveBeenNthCalledWith(
      2,
      'steamNotifications',
      true
    );

    await stop();
    await stop();

    expect(stopNotificationSystem).toHaveBeenCalledTimes(1);
    expect(stopScheduler).toHaveBeenCalledTimes(1);
    expect(setServiceStatus).toHaveBeenNthCalledWith(
      3,
      'steamNotifications',
      false
    );
    expect(setServiceStatus).toHaveBeenNthCalledWith(
      4,
      'steamScheduler',
      false
    );
  });
});
