import {
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { Octokit } from 'octokit';
import type { Locale } from '../../../locales/types.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { parseRepo } from '../services/githubClient.js';
import { handleApiError } from './githubUtils.js';

const MAX_LIST_ITEMS = 10;

export async function executeIssueCommand(
  interaction: ChatInputCommandInteraction,
  octokit: Octokit,
  locale: Locale
): Promise<void> {
  const repoStr = interaction.options.getString('repo', true);
  const parsed = parseRepo(repoStr);
  if (!parsed) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.invalidRepo', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'list') {
      const state = (interaction.options.getString('state') || 'open') as
        | 'open'
        | 'closed'
        | 'all';
      const { data } = await octokit.rest.issues.listForRepo({
        owner: parsed.owner,
        repo: parsed.repo,
        state,
        per_page: MAX_LIST_ITEMS,
      });

      const issues = data.filter((i) => !i.pull_request);

      if (issues.length === 0) {
        const embed = createEmbed({
          title: t('github.issue.list.title', locale),
          description: t('github.issue.list.noIssues', locale),
          color: COLORS.INFO,
          timestamp: true,
        });
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const list = issues
        .map(
          (issue) =>
            `[#${issue.number} ${issue.title}](${issue.html_url}) - ${issue.user?.login ?? '?'}`
        )
        .join('\n');

      const embed = createEmbed({
        title: t('github.issue.list.title', locale),
        description: list,
        color: COLORS.PRIMARY,
        footer: `${parsed.owner}/${parsed.repo} | ${state}`,
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'view') {
      const number = interaction.options.getInteger('number', true);
      const { data } = await octokit.rest.issues.get({
        owner: parsed.owner,
        repo: parsed.repo,
        issue_number: number,
      });

      if (data.pull_request) {
        const embed = createErrorEmbed(
          t('common.warning', locale),
          t('github.errors.isPullRequest', locale)
        );
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const stateLabel =
        data.state === 'open' ? t('github.pr.list.open', locale) : t('github.pr.list.closed', locale);

      const embed = createEmbed({
        title: t('github.issue.view.title', locale, { number }),
        url: data.html_url ?? undefined,
        description: data.body?.slice(0, 500) ?? '',
        color: data.state === 'open' ? COLORS.SUCCESS : COLORS.INFO,
        fields: [
          {
            name: t('github.issue.view.state', locale),
            value: stateLabel,
            inline: true,
          },
          {
            name: t('github.issue.view.author', locale),
            value: data.user?.login ?? '?',
            inline: true,
          },
        ],
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'create') {
      const title = interaction.options.getString('title', true);
      const body = interaction.options.getString('body') ?? '';

      const { data } = await octokit.rest.issues.create({
        owner: parsed.owner,
        repo: parsed.repo,
        title,
        body: body || undefined,
      });

      const embed = createEmbed({
        title: t('github.issue.create.success', locale),
        description: t('github.issue.create.successDesc', locale, {
          title: data.title ?? '',
        }),
        url: data.html_url ?? undefined,
        color: COLORS.SUCCESS,
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  } catch (error) {
    const msg = handleApiError(error, locale);
    const embed = createErrorEmbed(t('common.error', locale), msg);
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}
