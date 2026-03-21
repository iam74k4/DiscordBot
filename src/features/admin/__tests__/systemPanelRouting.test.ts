import { beforeEach, describe, expect, it, vi } from 'vitest';

const showAdminSystemPanel = vi.fn();

vi.mock('../application/systemPanel.js', () => ({
  showAdminSystemPanel,
}));

vi.mock('../../../config/env.js', () => ({
  isBotOwner: vi.fn(() => true),
}));

vi.mock('../../../infrastructure/backup/index.js', () => ({
  backupService: {
    runBackup: vi.fn(),
  },
}));

describe('admin system panel routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the system panel for stats', async () => {
    const { executeAdminCommand } = await import('../application/admin.js');

    const interaction = {
      locale: 'en-US',
      user: { id: 'owner-1' },
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue('system'),
        getSubcommand: vi.fn().mockReturnValue('stats'),
      },
      reply: vi.fn(),
    } as never;

    await executeAdminCommand(interaction);

    expect(showAdminSystemPanel).toHaveBeenCalledWith(
      interaction,
      'en',
      'stats'
    );
  });

  it('opens the backups panel for backup list', async () => {
    const { executeAdminCommand } = await import('../application/admin.js');

    const interaction = {
      locale: 'ja',
      user: { id: 'owner-1' },
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue('backup'),
        getSubcommand: vi.fn().mockReturnValue('list'),
      },
      reply: vi.fn(),
    } as never;

    await executeAdminCommand(interaction);

    expect(showAdminSystemPanel).toHaveBeenCalledWith(
      interaction,
      'ja',
      'backups'
    );
  });
});
