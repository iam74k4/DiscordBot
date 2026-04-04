import { PermissionsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandInfo } from '../../../shared/help/catalog.js';

const originalEnv = { ...process.env };

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
}));

vi.mock('../../../locales/index.js', () => ({
  t: (key: string) => key,
  mapDiscordLocale: () => 'en',
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

async function loadHelpModule(
  overrides: Record<string, string | undefined> = {}
): Promise<typeof import('./help.js')> {
  restoreEnv();
  Object.assign(process.env, {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    BOT_OWNER_IDS: 'owner-1',
    NODE_ENV: 'development',
  });

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  vi.resetModules();
  return import('./help.js');
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('canUserSeeCommandWithContext', () => {
  const githubCommand: CommandInfo = {
    name: 'github',
    description: { en: 'GitHub', ja: 'GitHub' },
    requiredPermission: ['manageGuild', 'owner'],
  };

  const memberWithManageGuild = {
    permissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild),
  };

  it('hides github help from non-owners when no allowlist is configured', async () => {
    const { canUserSeeCommandWithContext } = await loadHelpModule();

    expect(
      canUserSeeCommandWithContext(githubCommand, {
        userId: 'member-1',
        guild: { id: 'guild-1' },
        member: memberWithManageGuild,
      })
    ).toBe(false);
  });

  it('shows github help to non-owners when an allowlist is configured', async () => {
    const { canUserSeeCommandWithContext } = await loadHelpModule({
      GITHUB_ALLOWED_REPOS: 'iam74k4/DiscordBot',
    });

    expect(
      canUserSeeCommandWithContext(githubCommand, {
        userId: 'member-1',
        guild: { id: 'guild-1' },
        member: memberWithManageGuild,
      })
    ).toBe(true);
  });

  it('always shows github help to bot owners', async () => {
    const { canUserSeeCommandWithContext } = await loadHelpModule();

    expect(
      canUserSeeCommandWithContext(githubCommand, {
        userId: 'owner-1',
        guild: null,
        member: null,
      })
    ).toBe(true);
  });
});
