import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executePingCommand } from '../application/index.js';

/**
 * Ping command - check bot latency
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency')
    .setDescriptionLocalizations({
      ja: 'Botのレイテンシを確認',
    }),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000, // 3 seconds cooldown
  },

  async execute(interaction) {
    await executePingCommand(interaction);
  },
};

export default command;
