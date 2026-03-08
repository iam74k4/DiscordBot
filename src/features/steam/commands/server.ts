import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeServerCommand } from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server information commands')
    .setDescriptionLocalizations({
      ja: 'サーバー情報コマンド',
    })
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription('View server statistics')
        .setDescriptionLocalizations({
          ja: 'サーバー統計を表示',
        })
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds (heavier command)
  },

  async execute(interaction) {
    await executeServerCommand(interaction);
  },
};

export default command;
