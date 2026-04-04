import { ChatInputCommandInteraction } from 'discord.js';
import type { Octokit } from 'octokit';
import type { Locale } from '../../../locales/types.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { parseRepo } from '../integrations/githubClient.js';
import { handleApiError } from './githubUtils.js';
import { sendPaginatedMessage } from '../../../shared/utils/pagination.js';
import { trackRepo } from './autocomplete.js';

const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 100;

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
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  trackRepo(repoStr);
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
        per_page: MAX_FETCH,
      });

      const issues = data.filter((i) => !i.pull_request);

      if (issues.length === 0) {
        const embed = createEmbed({
          title: t('github.issue.list.title', locale),
          description: t('github.issue.list.noIssues', locale),
          color: COLORS.INFO,
        });
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await sendPaginatedMessage({
        items: issues,
        itemsPerPage: ITEMS_PER_PAGE,
        interaction,
        formatPage: (pageIssues, page, totalPages) => {
          const list = pageIssues
            .map(
              (issue) =>
                `[#${issue.number} ${issue.title}](${issue.html_url}) - ${issue.user?.login ?? '?'}`
            )
            .join('\n');

          return createEmbed({
            title: t('github.issue.list.title', locale),
            description: list,
            color: COLORS.PRIMARY,
            footer: `${parsed.owner}/${parsed.repo} | ${state} | ${page + 1}/${totalPages}`,
          });
        },
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
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const stateLabel =
        data.state === 'open'
          ? t('github.pr.list.open', locale)
          : t('github.pr.list.closed', locale);

      const labels =
        data.labels
          ?.map((l) => (typeof l === 'string' ? l : l.name))
          .join(', ') || '-';
      const assignees = data.assignees?.map((a) => a.login).join(', ') || '-';
      const milestone = data.milestone?.title ?? '-';

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
          {
            name: t('github.issue.view.assignees', locale),
            value: assignees,
            inline: true,
          },
          {
            name: t('github.issue.view.labels', locale),
            value: labels,
            inline: true,
          },
          {
            name: t('github.issue.view.milestone', locale),
            value: milestone,
            inline: true,
          },
        ],
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 'create' subcommand is handled via Modal (see events/githubModal.ts)
  } catch (error) {
    const msg = handleApiError(error, locale);
    const embed = createErrorEmbed(t('common.error', locale), msg);
    await interaction.editReply({ embeds: [embed] });
  }
}
