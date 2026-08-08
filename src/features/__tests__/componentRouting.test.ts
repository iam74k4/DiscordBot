import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageComponentInteraction } from 'discord.js';

vi.mock('../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

vi.mock('../../infrastructure/health/index.js', () => ({
  setServiceStatus: vi.fn(),
}));

const { dispatchComponent, routeComponentToFeatures } =
  await import('../index.js');

type TestModule = Parameters<typeof dispatchComponent>[0][number];

function feature(name: string, handleComponent?: unknown): TestModule {
  return {
    name,
    start: vi.fn(),
    stop: vi.fn(),
    ...(handleComponent ? { handleComponent } : {}),
  } as TestModule;
}

const interaction = { customId: 'poll_vote_0' } as MessageComponentInteraction;

describe('routeComponentToFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops at the first feature that claims the interaction', async () => {
    const first = vi.fn().mockResolvedValue(false);
    const second = vi.fn().mockResolvedValue(true);
    const third = vi.fn().mockResolvedValue(true);

    const handled = await dispatchComponent(
      [feature('a', first), feature('b', second), feature('c', third)],
      interaction
    );

    expect(handled).toBe(true);
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
    expect(third).not.toHaveBeenCalled();
  });

  it('reports unhandled when no feature claims it', async () => {
    const modules = [
      feature('a', vi.fn().mockResolvedValue(false)),
      feature('b'),
    ];

    expect(await dispatchComponent(modules, interaction)).toBe(false);
  });

  it('skips features without a component handler', async () => {
    const handler = vi.fn().mockResolvedValue(true);
    const modules = [feature('no-ui'), feature('has-ui', handler)];

    expect(await dispatchComponent(modules, interaction)).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('does not let one feature throwing reach the caller', async () => {
    const thrower = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      dispatchComponent([feature('broken', thrower)], interaction)
    ).resolves.toBe(true);
  });

  it('is a no-op before any feature is loaded', async () => {
    // The registry is empty until loadFeatures() runs.
    expect(await routeComponentToFeatures(interaction)).toBe(false);
  });
});
