import { ChatInputCommandInteraction } from 'discord.js';
import type { Octokit } from 'octokit';
import type { Locale } from '../../../locales/types.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { parseRepo } from '../services/githubClient.js';
import { handleApiError } from './githubUtils.js';
import { trackRepo } from './autocomplete.js';

export async function executeRepoCommand(
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

  try {
    const { data } = await octokit.rest.repos.get({
      owner: parsed.owner,
      repo: parsed.repo,
    });

    const desc =
      data.description?.slice(0, 500) ?? t('github.repo.info.noDesc', locale);

    const embed = createEmbed({
      title: t('github.repo.info.title', locale),
      url: data.html_url ?? undefined,
      description: desc,
      color: COLORS.PRIMARY,
      fields: [
        {
          name: t('github.repo.info.stars', locale),
          value: String(data.stargazers_count ?? 0),
          inline: true,
        },
        {
          name: t('github.repo.info.forks', locale),
          value: String(data.forks_count ?? 0),
          inline: true,
        },
        {
          name: t('github.repo.info.language', locale),
          value: data.language ?? '-',
          inline: true,
        },
        {
          name: t('github.repo.info.defaultBranch', locale),
          value: data.default_branch ?? 'main',
          inline: true,
        },
      ],
    });
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const msg = handleApiError(error, locale);
    const embed = createErrorEmbed(t('common.error', locale), msg);
    await interaction.editReply({ embeds: [embed] });
  }
}
