import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getErrorMessage, logger } from './logger.js';

const DEFAULT_TIMEOUT = 120_000;

export interface PaginationOptions<T> {
  items: T[];
  itemsPerPage: number;
  formatPage: (
    pageItems: T[],
    page: number,
    totalPages: number
  ) => EmbedBuilder;
  interaction: ChatInputCommandInteraction;
  timeout?: number;
  /** Message shown when a non-owner tries to navigate */
  onlyOwnerMessage?: string;
}

function buildPaginationButtons(
  page: number,
  totalPages: number,
  disabled: boolean = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('first')
      .setLabel('<<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('<')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('page')
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('>')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('last')
      .setLabel('>>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1)
  );
}

/**
 * Send a paginated message with navigation buttons.
 * Assumes the interaction has already been deferred.
 */
export async function sendPaginatedMessage<T>(
  options: PaginationOptions<T>
): Promise<void> {
  const {
    items,
    itemsPerPage,
    formatPage,
    interaction,
    timeout = DEFAULT_TIMEOUT,
    onlyOwnerMessage,
  } = options;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  let currentPage = 0;

  const getPageItems = (page: number) =>
    items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const embed = formatPage(getPageItems(currentPage), currentPage, totalPages);
  const buttons = buildPaginationButtons(currentPage, totalPages);

  const response = await interaction.editReply({
    embeds: [embed],
    components: totalPages > 1 ? [buttons] : [],
  });

  if (totalPages <= 1) return;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
  });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      if (onlyOwnerMessage) {
        await buttonInteraction.reply({
          content: onlyOwnerMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    switch (buttonInteraction.customId) {
      case 'first':
        currentPage = 0;
        break;
      case 'prev':
        currentPage = Math.max(0, currentPage - 1);
        break;
      case 'next':
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        break;
      case 'last':
        currentPage = totalPages - 1;
        break;
    }

    await buttonInteraction.update({
      embeds: [formatPage(getPageItems(currentPage), currentPage, totalPages)],
      components: [buildPaginationButtons(currentPage, totalPages)],
    });
  });

  collector.on('end', async () => {
    await interaction
      .editReply({
        components: [buildPaginationButtons(currentPage, totalPages, true)],
      })
      .catch((e: unknown) => {
        logger.debug(
          `Failed to disable pagination buttons: ${getErrorMessage(e)}`
        );
      });
  });
}
