import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
} from 'discord.js';
import { createErrorEmbed } from '../../../utils/embed.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { isBotOwner } from '../../../config/env.js';
import { getGitHubClient } from '../services/githubClient.js';
import { executePrCommand } from './pr.js';
import { executeIssueCommand } from './issue.js';
import { executeRepoCommand } from './repo.js';

function checkPermission(interaction: ChatInputCommandInteraction): boolean {
  if (isBotOwner(interaction.user.id)) return true;
  if (!interaction.guild || !interaction.member) return false;
  const perms = interaction.member.permissions;
  if (!(perms instanceof PermissionsBitField)) return false;
  return perms.has(PermissionsBitField.Flags.ManageGuild);
}

export async function executeGitHubCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!checkPermission(interaction)) {
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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const group = interaction.options.getSubcommandGroup(false);

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
    const message = error instanceof Error ? error.message : String(error);
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('github.errors.apiError', locale, { message })
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
