import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createErrorEmbed } from '../../../shared/utils/embed.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getGitHubClient } from '../integrations/githubClient.js';
import { executePrCommand } from './pr.js';
import { executeIssueCommand } from './issue.js';
import { executeRepoCommand } from './repo.js';
import type { Locale } from '../../../locales/types.js';
import { getErrorMessage } from '../../../shared/utils/logger.js';
import { canUseGitHubRepo } from './access.js';

function checkPermission(
  interaction: ChatInputCommandInteraction,
  repo?: string
): boolean {
  return canUseGitHubRepo(interaction, repo);
}

function isCreateSubcommand(interaction: ChatInputCommandInteraction): boolean {
  return interaction.options.getSubcommand(false) === 'create';
}

async function showCreateModal(
  interaction: ChatInputCommandInteraction,
  group: string,
  locale: Locale
): Promise<void> {
  const repo = interaction.options.getString('repo', true);
  const isPr = group === 'pr';

  const modalId = isPr
    ? `github_pr_create:${repo}`
    : `github_issue_create:${repo}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(
      isPr
        ? t('github.pr.create.modalTitle', locale)
        : t('github.issue.create.modalTitle', locale)
    );

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel(t('github.modal.titleLabel', locale))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const bodyInput = new TextInputBuilder()
    .setCustomId('body')
    .setLabel(t('github.modal.bodyLabel', locale))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(4000)
    .setPlaceholder(t('github.modal.bodyPlaceholder', locale));

  const rows: ActionRowBuilder<TextInputBuilder>[] = [
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(bodyInput),
  ];

  if (isPr) {
    const head = interaction.options.getString('head', true);
    const base = interaction.options.getString('base') ?? '';

    const headInput = new TextInputBuilder()
      .setCustomId('head')
      .setLabel(t('github.modal.headLabel', locale))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(head);

    const baseInput = new TextInputBuilder()
      .setCustomId('base')
      .setLabel(t('github.modal.baseLabel', locale))
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(base)
      .setPlaceholder('main');

    rows.push(
      new ActionRowBuilder<TextInputBuilder>().addComponents(headInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(baseInput)
    );
  }

  modal.addComponents(...rows);
  await interaction.showModal(modal);
}

export async function executeGitHubCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const repo = interaction.options.getString('repo', false) ?? undefined;

  if (!checkPermission(interaction, repo)) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.noPermission', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const client = getGitHubClient();
  if (!client) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.tokenNotSet', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);

  if (
    isCreateSubcommand(interaction) &&
    (group === 'pr' || group === 'issue')
  ) {
    await showCreateModal(interaction, group, locale);
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (group === 'pr') {
      await executePrCommand(interaction, client, locale);
      return;
    }
    if (group === 'issue') {
      await executeIssueCommand(interaction, client, locale);
      return;
    }
    if (group === 'repo') {
      await executeRepoCommand(interaction, client, locale);
      return;
    }

    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.apiError', locale, {
        message: 'Unknown subcommand group',
      })
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const message = getErrorMessage(error);
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.apiError', locale, { message })
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
