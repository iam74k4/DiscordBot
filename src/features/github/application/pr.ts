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

export async function executePrCommand(
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
      const { data } = await octokit.rest.pulls.list({
        owner: parsed.owner,
        repo: parsed.repo,
        state,
        per_page: MAX_LIST_ITEMS,
      });

      if (data.length === 0) {
        const embed = createEmbed({
          title: t('github.pr.list.title', locale),
          description: t('github.pr.list.noPrs', locale),
          color: COLORS.INFO,
          timestamp: true,
        });
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const list = data
        .map(
          (pr) =>
            `[#${pr.number} ${pr.title}](${pr.html_url}) - ${pr.user?.login ?? '?'}`
        )
        .join('\n');

      const embed = createEmbed({
        title: t('github.pr.list.title', locale),
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
      const { data } = await octokit.rest.pulls.get({
        owner: parsed.owner,
        repo: parsed.repo,
        pull_number: number,
      });

      const stateLabel =
        data.state === 'open'
          ? t('github.pr.list.open', locale)
          : t('github.pr.list.closed', locale);

      const embed = createEmbed({
        title: t('github.pr.view.title', locale, { number }),
        url: data.html_url ?? undefined,
        description: data.body?.slice(0, 500) ?? '',
        color: data.state === 'open' ? COLORS.SUCCESS : COLORS.INFO,
        fields: [
          {
            name: t('github.pr.view.state', locale),
            value: stateLabel,
            inline: true,
          },
          {
            name: t('github.pr.view.author', locale),
            value: data.user?.login ?? '?',
            inline: true,
          },
          {
            name: t('github.pr.view.base', locale),
            value: `${data.base?.ref ?? '?'}`,
            inline: true,
          },
          {
            name: t('github.pr.view.head', locale),
            value: `${data.head?.ref ?? '?'}`,
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
      const head = interaction.options.getString('head', true);
      let base = interaction.options.getString('base');

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
        body: body || undefined,
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
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'merge') {
      const number = interaction.options.getInteger('number', true);
      const method = (interaction.options.getString('method') || 'squash') as
        | 'merge'
        | 'squash'
        | 'rebase';

      await octokit.rest.pulls.merge({
        owner: parsed.owner,
        repo: parsed.repo,
        pull_number: number,
        merge_method: method,
      });

      const embed = createEmbed({
        title: t('github.pr.merge.success', locale),
        description: t('github.pr.merge.successDesc', locale, { number }),
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
