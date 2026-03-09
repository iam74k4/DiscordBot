import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../../types/index.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getGitHubClient } from '../services/githubClient.js';
import { parseRepo } from '../services/githubClient.js';
import { handleApiError } from '../application/githubUtils.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';
import { trackRepo } from '../application/autocomplete.js';

export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(_client, interaction) {
    if (!interaction.isModalSubmit()) return;

    const customId = interaction.customId;
    const isPrCreate = customId.startsWith('github_pr_create:');
    const isIssueCreate = customId.startsWith('github_issue_create:');

    if (!isPrCreate && !isIssueCreate) return;

    const locale = mapDiscordLocale(interaction.locale);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const repoStr = customId.split(':').slice(1).join(':');
    const parsed = parseRepo(repoStr);

    if (!parsed) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('github.errors.invalidRepo', locale)
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const octokit = getGitHubClient();
    if (!octokit) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('github.errors.tokenNotSet', locale)
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    trackRepo(repoStr);
    const title = interaction.fields.getTextInputValue('title');
    const body = interaction.fields.getTextInputValue('body') || undefined;

    try {
      if (isIssueCreate) {
        const { data } = await octokit.rest.issues.create({
          owner: parsed.owner,
          repo: parsed.repo,
          title,
          body,
        });

        const embed = createEmbed({
          title: t('github.issue.create.success', locale),
          description: t('github.issue.create.successDesc', locale, {
            title: data.title ?? '',
          }),
          url: data.html_url ?? undefined,
          color: COLORS.SUCCESS,
        });
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (isPrCreate) {
        const head = interaction.fields.getTextInputValue('head');
        let base = interaction.fields.getTextInputValue('base') || null;

        if (!base) {
          const { data: repoData } = await octokit.rest.repos.get({
            owner: parsed.owner,
            repo: parsed.repo,
          });
          base = repoData.default_branch ?? 'main';
        }

        const { data } = await octokit.rest.pulls.create({
          owner: parsed.owner,
          repo: parsed.repo,
          title,
          body,
          head,
          base,
        });

        const embed = createEmbed({
          title: t('github.pr.create.success', locale),
          description: t('github.pr.create.successDesc', locale, {
            title: data.title ?? '',
          }),
          url: data.html_url ?? undefined,
          color: COLORS.SUCCESS,
        });
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (error) {
      logger.error('GitHub modal submit error:', getErrorMessage(error));
      const msg = handleApiError(error, locale);
      const embed = createErrorEmbed(t('common.error', locale), msg);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default event;
