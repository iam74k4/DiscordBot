import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

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
    const embed = createErrorEmbed(
      t('common.error', locale),
      error instanceof Error
        ? error.message
        : t('admin.role.errors.failed', locale)
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}
