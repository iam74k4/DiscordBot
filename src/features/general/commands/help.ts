import { SlashCommandBuilder, AutocompleteInteraction } from 'discord.js';
import { Command } from '../../../types/index.js';
import {
  autocompleteHelpCommand,
  executeHelpCommand,
} from '../application/index.js';

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
    await autocompleteHelpCommand(interaction);
  },

  async execute(interaction) {
    await executeHelpCommand(interaction);
  },
};

export default command;
