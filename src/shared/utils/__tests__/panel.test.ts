import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageFlags } from 'discord.js';

vi.mock('../logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

vi.mock('../../../locales/index.js', () => ({
  t: (key: string) => key,
}));

const { runComponentPanel } = await import('../panel.js');

type Listener = (interaction: unknown) => Promise<void> | void;

/** Captures the collector callbacks so tests can fire components by hand. */
function createHarness(options?: { withCollector?: boolean }) {
  const listeners = new Map<string, Listener>();
  const editReply = vi.fn().mockResolvedValue({});

  const message = {
    createMessageComponentCollector: vi.fn(() => ({
      on: (event: string, listener: Listener) => {
        listeners.set(event, listener);
      },
    })),
  };

  // withResponse: true resolves to an InteractionCallbackResponse whose
  // resource carries the message; Discord may omit it.
  const response = {
    resource: options?.withCollector === false ? null : { message },
  };

  const interaction = {
    user: { id: 'owner-1' },
    reply: vi.fn().mockResolvedValue(response),
    editReply,
  };

  return {
    interaction,
    editReply,
    collect: (componentInteraction: unknown) =>
      listeners.get('collect')?.(componentInteraction),
    end: () => listeners.get('end')?.(undefined),
    hasListeners: () => listeners.size > 0,
  };
}

function componentFrom(userId = 'owner-1') {
  return {
    user: { id: userId },
    customId: 'panel:tab',
    update: vi.fn().mockResolvedValue({}),
    reply: vi.fn().mockResolvedValue({}),
    deferUpdate: vi.fn().mockResolvedValue({}),
  };
}

describe('runComponentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replies ephemerally with the first render', async () => {
    const harness = createHarness();

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: ['first'], components: ['row'] }) as never,
      renderDisabled: () => ['disabled'] as never,
      onComponent: () => 'update',
    });

    expect(harness.interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: ['first'],
        components: ['row'],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
      })
    );
  });

  it('can reply publicly when a panel opts out of ephemeral', async () => {
    const harness = createHarness();

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      ephemeral: false,
      render: () => ({ embeds: [], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent: () => 'update',
    });

    const payload = harness.interaction.reply.mock.calls[0][0];
    expect(payload.flags).toBeUndefined();
  });

  it('re-renders after a component is handled with "update"', async () => {
    const harness = createHarness();
    let view = 'a';

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [view], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent: () => {
        view = 'b';
        return 'update';
      },
    });

    const component = componentFrom();
    await harness.collect(component);

    expect(component.update).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: ['b'] })
    );
  });

  it('leaves the message alone when the callback already responded', async () => {
    const harness = createHarness();

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent: () => 'handled',
    });

    const component = componentFrom();
    await harness.collect(component);

    expect(component.update).not.toHaveBeenCalled();
  });

  it('refuses components from anyone but the command runner', async () => {
    const harness = createHarness();
    const onComponent = vi.fn().mockReturnValue('update');

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent,
    });

    const intruder = componentFrom('someone-else');
    await harness.collect(intruder);

    expect(onComponent).not.toHaveBeenCalled();
    expect(intruder.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'help.onlyCommandUser' })
    );
  });

  it('acknowledges the click when the handler throws', async () => {
    const harness = createHarness();

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent: () => {
        throw new Error('boom');
      },
    });

    const component = componentFrom();
    await harness.collect(component);

    // Without this the user sees "interaction failed".
    expect(component.deferUpdate).toHaveBeenCalled();
    expect(component.update).not.toHaveBeenCalled();
  });

  it('disables the components when the panel expires', async () => {
    const harness = createHarness();

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [], components: ['live'] }) as never,
      renderDisabled: () => ['disabled'] as never,
      onComponent: () => 'update',
    });

    await harness.end();

    expect(harness.editReply).toHaveBeenCalledWith({
      components: ['disabled'],
    });
  });

  it('returns quietly when Discord returns no message to collect on', async () => {
    const harness = createHarness({ withCollector: false });

    await runComponentPanel({
      interaction: harness.interaction as never,
      locale: 'en',
      label: 'test panel',
      render: () => ({ embeds: [], components: [] }) as never,
      renderDisabled: () => [] as never,
      onComponent: () => 'update',
    });

    expect(harness.hasListeners()).toBe(false);
  });
});
