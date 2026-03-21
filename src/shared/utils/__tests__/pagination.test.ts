import { describe, expect, it, vi } from 'vitest';
import { ComponentType, EmbedBuilder } from 'discord.js';
import { sendPaginatedMessage } from '../pagination.js';
import { createMockInteraction } from '../../../__tests__/helpers/discord.js';

vi.mock('../logger.js', () => ({
  logger: { debug: vi.fn() },
  getErrorMessage: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

describe('sendPaginatedMessage', () => {
  it('sends single page without buttons and returns early', async () => {
    const interaction = createMockInteraction();
    const editReply = vi.fn().mockResolvedValue({});

    Object.assign(interaction, {
      editReply,
      user: { id: 'user-1' },
    });

    await sendPaginatedMessage({
      items: [{ id: 1 }, { id: 2 }],
      itemsPerPage: 10,
      formatPage: (pageItems, page, total) =>
        new EmbedBuilder()
          .setTitle(`Page ${page + 1}/${total}`)
          .setDescription(
            pageItems.map((i) => (i as { id: number }).id).join(', ')
          ),
      interaction: interaction as never,
    });

    expect(editReply).toHaveBeenCalledTimes(1);
    expect(editReply.mock.calls[0][0].components).toEqual([]);
  });

  it('sends multi-page with navigation buttons', async () => {
    const interaction = createMockInteraction();
    const mockCollector = {
      on: vi.fn().mockReturnThis(),
    };

    const mockResponse = {
      createMessageComponentCollector: vi.fn(() => mockCollector),
    };

    const editReply = vi.fn().mockResolvedValue(mockResponse);

    Object.assign(interaction, {
      editReply,
      user: { id: 'user-1' },
    });

    const formatPage = vi.fn(
      (pageItems: { n: number }[], page: number, total: number) =>
        new EmbedBuilder()
          .setTitle(`Page ${page + 1}/${total}`)
          .setDescription(pageItems.map((i) => i.n).join(','))
    );

    await sendPaginatedMessage({
      items: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }],
      itemsPerPage: 2,
      formatPage,
      interaction: interaction as never,
    });

    expect(editReply).toHaveBeenCalledTimes(1);
    expect(editReply.mock.calls[0][0].components).toHaveLength(1);

    const collectorConfig =
      mockResponse.createMessageComponentCollector.mock.calls[0][0];
    expect(collectorConfig.componentType).toBe(ComponentType.Button);
    expect(collectorConfig.time).toBe(120_000);

    expect(formatPage).toHaveBeenCalledWith([{ n: 1 }, { n: 2 }], 0, 3);
  });
});
