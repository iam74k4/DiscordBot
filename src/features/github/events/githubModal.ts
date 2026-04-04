import { Events, MessageFlags } from 'discord.js';
import { Event } from '../../../shared/types/index.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getGitHubClient, parseRepo } from '../integrations/githubClient.js';
import { handleApiError } from '../application/githubUtils.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { trackRepo } from '../application/autocomplete.js';
import { canUseGitHubRepo } from '../application/access.js';

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
    if (!canUseGitHubRepo(interaction, repoStr)) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('github.errors.noPermission', locale)
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }
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
    const rawTitle = interaction.fields.getTextInputValue('title');
    const title = rawTitle.trim();
    const body =
      (interaction.fields.getTextInputValue('body') || '').trim() || undefined;

    if (!title) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('github.errors.titleEmpty', locale)
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (title.length > 256) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('github.errors.titleTooLong', locale)
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

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
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (editError) {
        logger.warn(
          'Failed to edit reply after GitHub error:',
          getErrorMessage(editError)
        );
      }
    }
  },
};

export default event;
