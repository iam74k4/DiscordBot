import { Collection } from 'discord.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The bootstrap path itself: discovery finds the real feature modules and
 * command files, and an interaction routed through the router reaches the
 * feature that owns it. Unit tests cover each seam in isolation; this checks
 * they are actually connected.
 */

vi.mock('../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

const handlePollVote = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../features/community/poll/pollService.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../features/community/poll/pollService.js')
  >('../../features/community/poll/pollService.js');
  return { ...actual, handlePollVote };
});

const { loadFeatures, getFeatureModules, routeComponentToFeatures } =
  await import('../../features/index.js');
const { pollStore } = await import('../../features/community/poll/index.js');
const { routeInteraction } =
  await import('../../app/interactions/interactionRouter.js');

function buttonInteraction(customId: string, messageId = 'msg-1') {
  return {
    customId,
    message: { id: messageId },
    user: { id: 'user-1', tag: 'User#0001' },
    guildId: 'guild-1',
    locale: 'en-US',
    isButton: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isStringSelectMenu: () => false,
    reply: vi.fn().mockResolvedValue({}),
  };
}

describe('feature discovery', () => {
  beforeAll(async () => {
    await loadFeatures();
  });

  it('finds every feature that ships a lifecycle module', () => {
    const names = getFeatureModules()
      .map((feature) => feature.name)
      .sort();

    expect(names).toEqual([
      'admin',
      'community',
      'general',
      'notification',
      'voice',
    ]);
  });

  it('gives every feature a usable start and stop', () => {
    for (const feature of getFeatureModules()) {
      expect(typeof feature.start).toBe('function');
      expect(typeof feature.stop).toBe('function');
    }
  });

  it('registers the community component handler', () => {
    const community = getFeatureModules().find((f) => f.name === 'community');
    expect(typeof community?.handleComponent).toBe('function');
  });
});

describe('component routing reaches the owning feature', () => {
  beforeAll(async () => {
    await loadFeatures();
  });

  it('delivers a poll vote to community', async () => {
    handlePollVote.mockClear();
    pollStore.restore('msg-1', {
      question: 'Lunch?',
      options: ['Ramen', 'Curry'],
      votes: new Map(),
      creatorId: 'creator-1',
      anonymous: false,
      channelId: 'channel-1',
      guildId: 'guild-1',
      locale: 'en',
    });

    const handled = await routeComponentToFeatures(
      buttonInteraction('poll_vote_0') as never
    );

    expect(handled).toBe(true);
    expect(handlePollVote).toHaveBeenCalled();

    pollStore.clearAll();
  });

  it('leaves an unrecognised component unclaimed', async () => {
    const handled = await routeComponentToFeatures(
      buttonInteraction('something_else') as never
    );

    expect(handled).toBe(false);
  });

  it('routes through the interaction router, not just the registry', async () => {
    handlePollVote.mockClear();
    pollStore.restore('msg-2', {
      question: 'Lunch?',
      options: ['Ramen', 'Curry'],
      votes: new Map(),
      creatorId: 'creator-1',
      anonymous: false,
      channelId: 'channel-1',
      guildId: 'guild-1',
      locale: 'en',
    });

    const client = { commands: new Collection() };
    await routeInteraction(
      client as never,
      buttonInteraction('poll_vote_1', 'msg-2') as never
    );

    expect(handlePollVote).toHaveBeenCalled();

    pollStore.clearAll();
  });
});
