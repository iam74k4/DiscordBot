import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  getHelpCategories,
  type CommandCategory,
  type CommandInfo,
  type PermissionLevel,
} from '../../../shared/help/catalog.js';
import { isBotOwner } from '../../../config/env.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';

interface PermissionContext {
  userId: string;
  guild: { id: string } | null;
  member: { permissions: PermissionsBitField } | null;
}

function getPermissionContext(
  interaction: AutocompleteInteraction | ChatInputCommandInteraction
): PermissionContext {
  return {
    userId: interaction.user.id,
    guild: interaction.guild,
    member: interaction.member as { permissions: PermissionsBitField } | null,
  };
}

function canUserSeeCommandWithContext(
  cmd: CommandInfo,
  ctx: PermissionContext
): boolean {
  const perm = cmd.requiredPermission;
  if (!perm || perm === 'everyone') return true;

  const levels = Array.isArray(perm) ? perm : [perm];

  for (const level of levels) {
    if (level === 'everyone') return true;
    if (level === 'owner') {
      if (isBotOwner(ctx.userId)) return true;
      continue;
    }
    if (level === 'manageGuild' || level === 'manageRoles') {
      if (!ctx.guild || !ctx.member) continue;
      const memberPerms = ctx.member.permissions;
      if (!(memberPerms instanceof PermissionsBitField)) continue;
      const bit =
        level === 'manageGuild'
          ? PermissionsBitField.Flags.ManageGuild
          : PermissionsBitField.Flags.ManageRoles;
      if (memberPerms.has(bit)) return true;
    }
  }
  return false;
}

function canUserSeeCommand(
  cmd: CommandInfo,
  interaction: AutocompleteInteraction | ChatInputCommandInteraction
): boolean {
  return canUserSeeCommandWithContext(cmd, getPermissionContext(interaction));
}

function getPermissionLabel(level: PermissionLevel, locale: string): string {
  const key = `help.permission.${level}` as const;
  return t(key, locale as 'ja' | 'en');
}

function formatCommandPermissionLabel(
  cmd: CommandInfo,
  locale: string
): string {
  const perm = cmd.requiredPermission;
  if (!perm || perm === 'everyone') return '';
  const levels = Array.isArray(perm) ? perm : [perm];
  const labels = levels
    .filter((l) => l !== 'everyone')
    .map((l) => getPermissionLabel(l, locale));
  return labels.length > 0 ? ` [${labels.join(', ')}]` : '';
}

function getVisibleCommandNames(
  interaction: AutocompleteInteraction | ChatInputCommandInteraction
): string[] {
  const ctx = getPermissionContext(interaction);
  const names: string[] = [];
  for (const category of getHelpCategories()) {
    for (const cmd of category.commands) {
      if (canUserSeeCommandWithContext(cmd, ctx)) {
        names.push(cmd.name);
      }
    }
  }
  return names;
}

function findCommand(name: string): CommandInfo | null {
  for (const category of getHelpCategories()) {
    for (const cmd of category.commands) {
      if (cmd.name === name) {
        return cmd;
      }
    }
  }
  return null;
}

export async function autocompleteHelpCommand(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const commands = getVisibleCommandNames(interaction);
  const filtered = commands.filter((c) => c.startsWith(focused));

  await interaction.respond(
    filtered.slice(0, 25).map((c) => ({ name: c, value: c }))
  );
}

export async function executeHelpCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const commandName = interaction.options.getString('command');

  if (commandName) {
    const cmd = findCommand(commandName);

    if (!cmd || !canUserSeeCommand(cmd, interaction)) {
      const embed = createEmbed({
        title: t('help.commandNotFound', locale),
        description: t('help.commandNotFoundDesc', locale, {
          command: commandName,
        }),
        color: COLORS.WARNING,
      });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const description =
      locale === 'ja' ? cmd.description.ja : cmd.description.en;

    const embed = createEmbed({
      title: `/${cmd.name}`,
      description,
      color: COLORS.PRIMARY,
      fields: cmd.usage
        ? [
            {
              name: t('help.usage', locale),
              value: `\`${cmd.usage}\``,
              inline: false,
            },
          ]
        : undefined,
      timestamp: true,
    });

    await interaction.reply({ embeds: [embed] });
    return;
  }

  const filteredCategories = getHelpCategories()
    .map((category) => ({
      ...category,
      commands: category.commands.filter((cmd) =>
        canUserSeeCommand(cmd, interaction)
      ),
    }))
    .filter((category) => category.commands.length > 0);

  const buildCategoryEmbed = (category: CommandCategory) => {
    const categoryName = locale === 'ja' ? category.name.ja : category.name.en;
    const commandList = category.commands
      .map((cmd) => {
        const desc = locale === 'ja' ? cmd.description.ja : cmd.description.en;
        const permLabel = formatCommandPermissionLabel(cmd, locale);
        return `\`/${cmd.name}\` - ${desc}${permLabel}`;
      })
      .join('\n');

    return createEmbed({
      title: categoryName,
      description: commandList,
      color: COLORS.PRIMARY,
      footer: t('help.filteredFooter', locale),
    });
  };

  const buildOverviewEmbed = () => {
    const fields = filteredCategories.map((category) => {
      const categoryName =
        locale === 'ja' ? category.name.ja : category.name.en;
      const commandList = category.commands
        .map((cmd) => {
          const desc =
            locale === 'ja' ? cmd.description.ja : cmd.description.en;
          const permLabel = formatCommandPermissionLabel(cmd, locale);
          return `\`/${cmd.name}\` - ${desc}${permLabel}`;
        })
        .join('\n');

      return { name: categoryName, value: commandList, inline: false };
    });

    return createEmbed({
      title: t('help.title', locale),
      description: t('help.description', locale),
      color: COLORS.PRIMARY,
      fields,
      footer: t('help.filteredFooter', locale),
    });
  };

  if (filteredCategories.length <= 1) {
    await interaction.reply({ embeds: [buildOverviewEmbed()] });
    return;
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder(t('help.selectCategory', locale))
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(t('help.showAll', locale))
        .setValue('all')
        .setDefault(true),
      ...filteredCategories.map((cat, index) => {
        const name = locale === 'ja' ? cat.name.ja : cat.name.en;
        return new StringSelectMenuOptionBuilder()
          .setLabel(name)
          .setValue(`cat_${index}`);
      })
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  const reply = await interaction.reply({
    embeds: [buildOverviewEmbed()],
    components: [row],
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
  });

  collector.on('collect', async (selectInteraction) => {
    if (selectInteraction.user.id !== interaction.user.id) {
      await selectInteraction.reply({
        content: t('help.onlyCommandUser', locale),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const value = selectInteraction.values[0];

    let embed;
    if (value === 'all') {
      embed = buildOverviewEmbed();
    } else {
      const catIndex = parseInt(value.replace('cat_', ''), 10);
      const category = filteredCategories[catIndex];
      if (!category) {
        await selectInteraction.reply({
          content: t('help.commandNotFoundDesc', locale, {
            command: value,
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      embed = buildCategoryEmbed(category);
    }

    const updatedMenu = StringSelectMenuBuilder.from(
      selectMenu.toJSON()
    ).setOptions(
      selectMenu.options.map((opt) =>
        StringSelectMenuOptionBuilder.from(opt.toJSON()).setDefault(
          opt.toJSON().value === value
        )
      )
    );
    const updatedRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        updatedMenu
      );
    await selectInteraction.update({
      embeds: [embed],
      components: [updatedRow],
    });
  });

  collector.on('end', async () => {
    const disabledMenu = StringSelectMenuBuilder.from(
      selectMenu.toJSON()
    ).setDisabled(true);
    const disabledRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        disabledMenu
      );
    await interaction
      .editReply({ components: [disabledRow] })
      .catch((e: unknown) => {
        logger.debug(
          `Failed to disable help select menu: ${getErrorMessage(e)}`
        );
      });
  });
}
