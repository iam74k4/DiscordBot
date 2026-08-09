import { AutocompleteInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import {
  autocompleteHelpCommand,
  executeGeneralCommand,
} from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('general')
    .setDescription('Start here for help, ping, and bot info')
    .setDescriptionLocalizations({
      ja: 'ヘルプ・Ping・Bot情報の入口',
    })
    .addSubcommand((sub) =>
      sub
        .setName('help')
        .setDescription('Browse commands and usage examples')
        .setDescriptionLocalizations({
          ja: 'コマンド一覧と使い方の例を表示',
        })
        .addStringOption((option) =>
          option
            .setName('command')
            .setDescription('Command name for detailed help')
            .setDescriptionLocalizations({
              ja: '詳細を表示するコマンド名',
            })
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ping')
        .setDescription('Check the bot latency')
        .setDescriptionLocalizations({
          ja: 'Botのレイテンシを確認',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('about')
        .setDescription('Show bot overview')
        .setDescriptionLocalizations({
          ja: 'Botの概要を表示',
        })
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000,
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteHelpCommand(interaction);
  },

  help: {
    category: { en: 'General', ja: '一般' },
  },

  async execute(interaction) {
    await executeGeneralCommand(interaction);
  },
};

export default command;
