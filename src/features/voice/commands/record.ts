import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import { executeRecordCommand } from '../application/index.js';

/**
 * Record command - record past audio from voice channel
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Record past audio from voice channel')
    .setDescriptionLocalizations({
      ja: 'ボイスチャンネルの過去音声を録音',
    })
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Recording duration')
        .setDescriptionLocalizations({
          ja: '録音時間',
        })
        .setRequired(true)
        .addChoices(
          { name: '30 seconds', value: '30s' },
          { name: '1 minute', value: '1m' },
          { name: '2 minutes', value: '2m' },
          { name: '3 minutes', value: '3m' },
          { name: '5 minutes (max)', value: '5m' }
        )
    ),

  middleware: ['permissions', 'cooldown'],

  options: {
    permissions: [PermissionFlagsBits.ManageGuild],
    cooldown: 10000, // 10 seconds cooldown
  },

  async execute(interaction) {
    await executeRecordCommand(interaction);
  },
};

export default command;
