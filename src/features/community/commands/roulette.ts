import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import { executeRouletteCommand } from '../application/index.js';

/**
 * Roulette command - random member selection and team assignment
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Random selection from voice channel members')
    .setDescriptionLocalizations({
      ja: 'ボイスチャンネルのメンバーからランダム選択',
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName('member')
        .setDescription('Randomly select one member from voice channel')
        .setDescriptionLocalizations({
          ja: 'ボイスチャンネルからランダムに1人選択',
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Divide voice channel members into teams')
        .setDescriptionLocalizations({
          ja: 'ボイスチャンネルのメンバーをチーム分け',
        })
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of teams')
            .setDescriptionLocalizations({
              ja: '作成するチーム数',
            })
            .setRequired(true)
            .addChoices(
              { name: '2 teams', value: 2 },
              { name: '3 teams', value: 3 },
              { name: '4 teams', value: 4 },
              { name: '5 teams', value: 5 },
              { name: '6 teams', value: 6 }
            )
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 10000, // 10 seconds cooldown (animation takes time)
  },

  async execute(interaction) {
    await executeRouletteCommand(interaction);
  },
};

export default command;
