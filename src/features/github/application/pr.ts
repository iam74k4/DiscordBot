import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
} from 'discord.js';
import type { Octokit } from 'octokit';
import type { Locale } from '../../../locales/types.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { parseRepo } from '../integrations/githubClient.js';
import { handleApiError } from './githubUtils.js';
import { sendPaginatedMessage } from '../../../shared/utils/pagination.js';
import { trackRepo } from './autocomplete.js';

const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 100;

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
      const { data } = await octokit.rest.pulls.list({
        owner: parsed.owner,
        repo: parsed.repo,
        state,
        per_page: MAX_FETCH,
      });

      if (data.length === 0) {
        const embed = createEmbed({
          title: t('github.pr.list.title', locale),
          description: t('github.pr.list.noPrs', locale),
          color: COLORS.INFO,
        });
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await sendPaginatedMessage({
        items: data,
        itemsPerPage: ITEMS_PER_PAGE,
        interaction,
        formatPage: (pagePrs, page, totalPages) => {
          const list = pagePrs
            .map(
              (pr) =>
                `[#${pr.number} ${pr.title}](${pr.html_url}) - ${pr.user?.login ?? '?'}`
            )
            .join('\n');

          return createEmbed({
            title: t('github.pr.list.title', locale),
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
      const { data } = await octokit.rest.pulls.get({
        owner: parsed.owner,
        repo: parsed.repo,
        pull_number: number,
      });

      const stateLabel =
        data.state === 'open'
          ? t('github.pr.list.open', locale)
          : t('github.pr.list.closed', locale);

      const labels =
        data.labels
          ?.map((l) => (typeof l === 'string' ? l : l.name))
          .join(', ') || '-';
      const mergeableText =
        data.mergeable == null ? '-' : data.mergeable ? '✅' : '❌';

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
            name: t('github.pr.view.mergeable', locale),
            value: mergeableText,
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
          {
            name: t('github.pr.view.changes', locale),
            value: `+${data.additions ?? 0} / -${data.deletions ?? 0} (${data.changed_files ?? 0} ${t('github.pr.view.files', locale)})`,
            inline: true,
          },
          {
            name: t('github.pr.view.labels', locale),
            value: labels,
            inline: false,
          },
        ],
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 'create' subcommand is handled via Modal (see events/githubModal.ts)

    if (subcommand === 'merge') {
      const number = interaction.options.getInteger('number', true);
      const method = (interaction.options.getString('method') || 'squash') as
        | 'merge'
        | 'squash'
        | 'rebase';

      const confirmId = `gh_merge_confirm_${interaction.id}`;
      const cancelId = `gh_merge_cancel_${interaction.id}`;

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel(t('github.pr.merge.confirmButton', locale))
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel(t('common.cancel', locale))
          .setStyle(ButtonStyle.Secondary)
      );

      const confirmEmbed = createWarningEmbed(
        t('github.pr.merge.confirmTitle', locale),
        t('github.pr.merge.confirmDesc', locale, { number, method })
      );

      const reply = await interaction.editReply({
        embeds: [confirmEmbed],
        components: [confirmRow],
      });

      try {
        const result = await reply.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: (i) => i.user.id === interaction.user.id,
          time: 30_000,
        });

        if (result.customId === confirmId) {
          await result.update({
            embeds: [
              createEmbed({
                title: t('github.pr.merge.merging', locale),
                color: COLORS.WARNING,
                timestamp: false,
              }),
            ],
            components: [],
          });

          try {
            await octokit.rest.pulls.merge({
              owner: parsed.owner,
              repo: parsed.repo,
              pull_number: number,
              merge_method: method,
            });
          } catch (error) {
            const msg = handleApiError(error, locale);
            const embed = createErrorEmbed(t('common.error', locale), msg);
            await interaction.editReply({ embeds: [embed], components: [] });
            return;
          }

          const embed = createEmbed({
            title: t('github.pr.merge.success', locale),
            description: t('github.pr.merge.successDesc', locale, { number }),
            color: COLORS.SUCCESS,
          });
          await interaction.editReply({ embeds: [embed] });
        } else {
          await result.update({
            embeds: [
              createEmbed({
                title: t('common.cancelled', locale),
                color: COLORS.INFO,
              }),
            ],
            components: [],
          });
        }
      } catch {
        await interaction
          .editReply({
            embeds: [
              createEmbed({
                title: t('common.timeout', locale),
                color: COLORS.INFO,
              }),
            ],
            components: [],
          })
          .catch(() => {});
      }
      return;
    }
  } catch (error) {
    const msg = handleApiError(error, locale);
    const embed = createErrorEmbed(t('common.error', locale), msg);
    await interaction.editReply({ embeds: [embed] });
  }
}
