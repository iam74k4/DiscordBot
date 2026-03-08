import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { createEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getHelpCategories, type CommandInfo } from '../../helpCatalog.js';

function getAllCommandNames(): string[] {
  const names: string[] = [];
  for (const category of getHelpCategories()) {
    for (const cmd of category.commands) {
      names.push(cmd.name);
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
  const commands = getAllCommandNames();
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

    if (!cmd) {
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

  const fields = getHelpCategories().map((category) => {
    const categoryName = locale === 'ja' ? category.name.ja : category.name.en;
    const commandList = category.commands
      .map((cmd) => {
        const desc = locale === 'ja' ? cmd.description.ja : cmd.description.en;
        return `\`/${cmd.name}\` - ${desc}`;
      })
      .join('\n');

    return {
      name: categoryName,
      value: commandList,
      inline: false,
    };
  });

  const embed = createEmbed({
    title: t('help.title', locale),
    description: t('help.description', locale),
    color: COLORS.PRIMARY,
    fields,
    footer: t('help.footer', locale),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}
