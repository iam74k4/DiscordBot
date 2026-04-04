import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import { executeRecordCommand } from '../application/index.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { connectionManager } from '../recording/connectionManager.js';
import { mapDiscordLocale } from '../../../locales/index.js';
import { env } from '../../../config/index.js';

/**
 * Record command - record past audio from voice channel
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice feature commands')
    .setDescriptionLocalizations({
      ja: 'ボイス機能コマンド',
    })
    .addSubcommand((sub) =>
      sub
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
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Show voice subsystem status')
        .setDescriptionLocalizations({
          ja: 'ボイス機能の状態を表示',
        })
    ),

  middleware: ['permissions', 'cooldown'],

  options: {
    permissions: [PermissionFlagsBits.ManageGuild],
    cooldown: 10000, // 10 seconds cooldown
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'record') {
      await executeRecordCommand(interaction);
      return;
    }

    const locale = mapDiscordLocale(interaction.locale);
    const activeConnections = connectionManager.getConnectionCount();
    const embed = createEmbed({
      title: locale === 'ja' ? 'ボイス機能の状態' : 'Voice subsystem status',
      color: COLORS.INFO,
      fields: [
        {
          name: locale === 'ja' ? 'アクティブ接続数' : 'Active connections',
          value: String(activeConnections),
          inline: true,
        },
        {
          name: locale === 'ja' ? '接続上限' : 'Connection limit',
          value: String(env.MAX_CONCURRENT_VC_CONNECTIONS),
          inline: true,
        },
      ],
    });
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
