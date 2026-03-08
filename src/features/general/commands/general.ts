import { AutocompleteInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import {
  autocompleteHelpCommand,
  executeGeneralCommand,
} from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('general')
    .setDescription('General utility commands')
    .setDescriptionLocalizations({
      ja: '一般ユーティリティコマンド',
    })
    .addSubcommand((sub) =>
      sub
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
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ping')
        .setDescription('Check the bot latency')
        .setDescriptionLocalizations({
          ja: 'Botのレイテンシを確認',
        })
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000,
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteHelpCommand(interaction);
  },

  async execute(interaction) {
    await executeGeneralCommand(interaction);
  },
};

export default command;
