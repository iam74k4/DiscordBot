import { beforeEach, describe, expect, it, vi } from 'vitest';

const exec = vi.fn();

vi.mock('../connection.js', () => ({
  database: { exec },
}));

describe('legacy Steam migrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not create removed Steam feature tables on fresh databases', async () => {
    const steamMigration = await import('../migrations/001_steam.js');
    const steamNotificationMigration =
      await import('../migrations/002_notifications.js');

    steamMigration.up();
    steamNotificationMigration.up();

    expect(exec).not.toHaveBeenCalled();
  });

  it('does not drop existing legacy Steam data', async () => {
    const dropSteamMigration = await import('../migrations/005_drop_steam.js');

    dropSteamMigration.up();

    expect(exec).not.toHaveBeenCalled();
  });
});
