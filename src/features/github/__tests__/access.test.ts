import { PermissionsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

async function loadAccessModule(
  overrides: Record<string, string | undefined> = {}
): Promise<typeof import('../application/access.js')> {
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
  return import('../application/access.ts');
}

function createInteraction(
  userId: string,
  canManageGuild = false
): {
  user: { id: string };
  member: { permissions: PermissionsBitField } | null;
} {
  return {
    user: { id: userId },
    member: canManageGuild
      ? {
          permissions: new PermissionsBitField(
            PermissionsBitField.Flags.ManageGuild
          ),
        }
      : null,
  };
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('GitHub access control', () => {
  it('allows bot owners regardless of repository allowlist', async () => {
    const { canSearchGitHubRepos, canUseGitHubRepo } = await loadAccessModule();
    const interaction = createInteraction('owner-1');

    expect(canUseGitHubRepo(interaction as never, 'octo/private-repo')).toBe(
      true
    );
    expect(canSearchGitHubRepos(interaction as never)).toBe(true);
  });

  it('allows guild managers only for allowlisted repositories', async () => {
    const { canUseGitHubRepo, getAllowedGitHubRepos } = await loadAccessModule({
      GITHUB_ALLOWED_REPOS: 'Iam74k4/DiscordBot,octo/Hello-World',
    });
    const interaction = createInteraction('member-1', true);

    expect(getAllowedGitHubRepos()).toEqual([
      'iam74k4/discordbot',
      'octo/hello-world',
    ]);
    expect(canUseGitHubRepo(interaction as never, 'iam74k4/discordbot')).toBe(
      true
    );
    expect(canUseGitHubRepo(interaction as never, 'octo/hello-world')).toBe(
      true
    );
  });

  it('blocks guild managers for non-allowlisted repositories', async () => {
    const { canUseGitHubRepo } = await loadAccessModule({
      GITHUB_ALLOWED_REPOS: 'iam74k4/DiscordBot',
    });
    const interaction = createInteraction('member-1', true);

    expect(canUseGitHubRepo(interaction as never, 'octo/hello-world')).toBe(
      false
    );
  });

  it('blocks broad non-owner GitHub access when no allowlist is configured', async () => {
    const { canSearchGitHubRepos, canUseGitHubRepo } = await loadAccessModule();
    const interaction = createInteraction('member-1', true);

    expect(canUseGitHubRepo(interaction as never)).toBe(false);
    expect(canUseGitHubRepo(interaction as never, 'iam74k4/discordbot')).toBe(
      false
    );
    expect(canSearchGitHubRepos(interaction as never)).toBe(false);
  });

  it('normalizes repository names before allowlist comparison', async () => {
    const { isGitHubRepoAllowed, normalizeGitHubRepo } = await loadAccessModule(
      {
        GITHUB_ALLOWED_REPOS: 'Iam74k4/DiscordBot',
      }
    );

    expect(normalizeGitHubRepo(' Iam74k4/DiscordBot ')).toBe(
      'iam74k4/discordbot'
    );
    expect(isGitHubRepoAllowed('IAM74K4/DISCORDBOT')).toBe(true);
  });
});
