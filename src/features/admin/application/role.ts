import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

function checkManageRoles(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;
  const memberPerms = interaction.member.permissions;
  if (!(memberPerms instanceof PermissionsBitField)) return false;
  return memberPerms.has(PermissionsBitField.Flags.ManageRoles);
}

function checkBotCanManageRole(
  interaction: ChatInputCommandInteraction,
  roleId: string
): boolean {
  const guild = interaction.guild;
  if (!guild?.members.me) return false;
  const botHighestRole = guild.members.me.roles.highest;
  const role = guild.roles.cache.get(roleId);
  if (!role) return false;
  return botHighestRole.position > role.position;
}

async function checkActorCanManageRole(
  interaction: ChatInputCommandInteraction,
  roleId: string
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) return false;

  const executor = await guild.members
    .fetch(interaction.user.id)
    .catch(() => null);
  const role = guild.roles.cache.get(roleId);
  if (!executor || !role) return false;

  return executor.roles.highest.position > role.position;
}

export async function executeRoleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('common.guildOnly', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!checkManageRoles(interaction)) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('admin.role.errors.noPermission', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);

  const member = await interaction.guild.members
    .fetch(user.id)
    .catch(() => null);
  if (!member || !(member instanceof GuildMember)) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('admin.role.errors.memberNotFound', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!checkBotCanManageRole(interaction, role.id)) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('admin.role.errors.roleHierarchy', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!(await checkActorCanManageRole(interaction, role.id))) {
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('admin.role.errors.roleHierarchy', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'add') {
      if (member.roles.cache.has(role.id)) {
        const embed = createErrorEmbed(
          t('common.warning', locale),
          t('admin.role.errors.alreadyHasRole', locale)
        );
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await member.roles.add(role.id);
      const embed = createEmbed({
        title: t('admin.role.add.success', locale),
        description: t('admin.role.add.successDesc', locale, {
          user: user.tag,
          role: role.name,
        }),
        color: COLORS.SUCCESS,
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      if (!member.roles.cache.has(role.id)) {
        const embed = createErrorEmbed(
          t('common.warning', locale),
          t('admin.role.errors.doesNotHaveRole', locale)
        );
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await member.roles.remove(role.id);
      const embed = createEmbed({
        title: t('admin.role.remove.success', locale),
        description: t('admin.role.remove.successDesc', locale, {
          user: user.tag,
          role: role.name,
        }),
        color: COLORS.SUCCESS,
        timestamp: true,
      });
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error(
      `Failed to ${subcommand} role ${role.id} for ${user.id}:`,
      getErrorMessage(error)
    );
    const embed = createErrorEmbed(
      t('common.error', locale),
      t('admin.role.errors.failed', locale)
    );
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] }).catch(() => {});
    } else {
      await interaction
        .reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
}
