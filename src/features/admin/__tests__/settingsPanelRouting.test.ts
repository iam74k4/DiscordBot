import { beforeEach, describe, expect, it, vi } from 'vitest';

const showSettingsPanel = vi.fn();

vi.mock('../application/settingsPanel.js', () => ({
  showSettingsPanel,
}));

vi.mock('../repositories/index.js', () => ({
  settingsRepository: {
    getGuildSettings: vi.fn(),
    setAuditChannel: vi.fn(),
    setGuildSettings: vi.fn(),
  },
}));

vi.mock('../../../services/audit/index.js', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('../../../utils/discord.js', () => ({
  interactionHasGuildPermission: vi.fn(() => true),
  getSendableTextChannel: vi.fn(),
}));

describe('admin settings panel routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the overview panel from settings view', async () => {
    const { executeSettingsCommand } = await import('../application/settings.js');

    const interaction = {
      locale: 'en-US',
      guild: { id: 'guild-1' },
      options: {
        getSubcommand: vi.fn().mockReturnValue('view'),
      },
      reply: vi.fn(),
    } as never;

    await executeSettingsCommand(interaction);

    expect(showSettingsPanel).toHaveBeenCalledWith(interaction, 'en', 'overview');
  });

  it('opens the logs panel from settings logs', async () => {
    const { executeSettingsCommand } = await import('../application/settings.js');

    const interaction = {
      locale: 'ja',
      guild: { id: 'guild-1' },
      options: {
        getSubcommand: vi.fn().mockReturnValue('logs'),
      },
      reply: vi.fn(),
    } as never;

    await executeSettingsCommand(interaction);

    expect(showSettingsPanel).toHaveBeenCalledWith(interaction, 'ja', 'logs');
  });
});
