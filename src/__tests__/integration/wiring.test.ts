import { Collection } from 'discord.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The bootstrap path itself: discovery finds the real feature modules and
 * command files, and an interaction routed through the router reaches the
 * command that owns it. Unit tests cover each seam in isolation; this checks
 * they are actually connected.
 */

vi.mock('../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

const { loadFeatures, getFeatureModules, routeComponentToFeatures } =
  await import('../../features/index.js');
const { discoverFeatureCommands } =
  await import('../../app/interactions/commandRegistry.js');
const { routeInteraction } =
  await import('../../app/interactions/interactionRouter.js');

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
});

describe('command routing reaches the owning command', () => {
  it('executes the discovered command the interaction names', async () => {
    const discovered = await discoverFeatureCommands(
      new URL('../../features', import.meta.url).pathname
    );
    expect(discovered.map((entry) => entry.command.data.name)).toContain(
      'community'
    );

    const registry = new Collection<string, { execute: () => unknown }>();
    const execute = vi.fn().mockResolvedValue(undefined);
    registry.set('general', { execute });

    await routeInteraction(
      { commands: registry } as never,
      {
        commandName: 'general',
        user: { id: 'user-1', tag: 'User#0001' },
        guildId: 'guild-1',
        locale: 'en-US',
        isButton: () => false,
        isAutocomplete: () => false,
        isChatInputCommand: () => true,
        isStringSelectMenu: () => false,
        options: { getSubcommand: () => 'ping' },
        reply: vi.fn().mockResolvedValue({}),
      } as never
    );

    expect(execute).toHaveBeenCalled();
  });

  it('leaves a component no feature claims unhandled', async () => {
    // Polls are native, so nothing currently registers a component handler.
    // An unclaimed button must fall through quietly rather than throw.
    const handled = await routeComponentToFeatures({
      customId: 'something_else',
      message: { id: 'msg-1' },
      user: { id: 'user-1', tag: 'User#0001' },
      guildId: 'guild-1',
      locale: 'en-US',
      isButton: () => true,
    } as never);

    expect(handled).toBe(false);
  });
});
