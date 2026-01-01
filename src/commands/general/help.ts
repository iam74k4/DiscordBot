import { SlashCommandBuilder, AutocompleteInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

/**
 * Command definitions for help display
 */
interface CommandInfo {
  name: string;
  description: {
    en: string;
    ja: string;
  };
  usage?: string;
}

interface CommandCategory {
  name: {
    en: string;
    ja: string;
  };
  commands: CommandInfo[];
}

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: { en: 'General', ja: '一般' },
    commands: [
      {
        name: 'ping',
        description: {
          en: 'Check bot latency',
          ja: 'Botのレイテンシを確認',
        },
      },
      {
        name: 'server',
        description: {
          en: 'Display server information',
          ja: 'サーバー情報を表示',
        },
      },
      {
        name: 'help',
        description: {
          en: 'Show command list',
          ja: 'コマンド一覧を表示',
        },
      },
    ],
  },
  {
    name: { en: 'Steam', ja: 'Steam' },
    commands: [
      {
        name: 'steam',
        description: {
          en: 'Steam profile and statistics',
          ja: 'Steamプロフィールと統計',
        },
        usage: '/steam profile, /steam register, /steam ranking',
      },
      {
        name: 'notify',
        description: {
          en: 'Game launch notifications',
          ja: 'ゲーム起動通知',
        },
        usage: '/notify setup, /notify enable, /notify disable',
      },
    ],
  },
  {
    name: { en: 'Voice', ja: 'ボイス' },
    commands: [
      {
        name: 'record',
        description: {
          en: 'Record past audio from voice channel',
          ja: 'ボイスチャンネルの過去音声を録音',
        },
        usage: '/record <duration>',
      },
    ],
  },
  {
    name: { en: 'Community', ja: 'コミュニティ' },
    commands: [
      {
        name: 'poll',
        description: {
          en: 'Create and manage polls',
          ja: '投票の作成と管理',
        },
        usage: '/poll create, /poll end',
      },
      {
        name: 'roulette',
        description: {
          en: 'Random selection from voice channel',
          ja: 'ボイスチャンネルからランダム選択',
        },
        usage: '/roulette member, /roulette team',
      },
    ],
  },
  {
    name: { en: 'Admin', ja: '管理者' },
    commands: [
      {
        name: 'settings',
        description: {
          en: 'Server settings management',
          ja: 'サーバー設定の管理',
        },
        usage: '/settings view, /settings language, /settings audit',
      },
      {
        name: 'admin',
        description: {
          en: 'Bot administration commands',
          ja: 'Bot管理コマンド',
        },
        usage: '/admin reload, /admin deploy',
      },
    ],
  },
];

/**
 * Get all command names for autocomplete
 */
function getAllCommandNames(): string[] {
  const names: string[] = [];
  for (const category of COMMAND_CATEGORIES) {
    for (const cmd of category.commands) {
      names.push(cmd.name);
    }
  }
  return names;
}

/**
 * Find command info by name
 */
function findCommand(name: string): CommandInfo | null {
  for (const category of COMMAND_CATEGORIES) {
    for (const cmd of category.commands) {
      if (cmd.name === name) {
        return cmd;
      }
    }
  }
  return null;
}

/**
 * Help command - show command list and usage
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show command list and usage')
    .setDescriptionLocalizations({
      ja: 'コマンド一覧と使い方を表示',
    })
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Command name for detailed help')
        .setDescriptionLocalizations({
          ja: '詳細を表示するコマンド名',
        })
        .setAutocomplete(true)
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000,
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const commands = getAllCommandNames();
    const filtered = commands.filter((c) => c.startsWith(focused));

    await interaction.respond(
      filtered.slice(0, 25).map((c) => ({ name: c, value: c }))
    );
  },

  async execute(interaction) {
    const locale = mapDiscordLocale(interaction.locale);
    const commandName = interaction.options.getString('command');

    if (commandName) {
      // Show specific command details
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

      const description = locale === 'ja' ? cmd.description.ja : cmd.description.en;

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
    } else {
      // Show all commands
      const fields = COMMAND_CATEGORIES.map((category) => {
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
  },
};

export default command;

