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
import { mapDiscordLocale, t } from '../../../locales/index.js';
import { env } from '../../../config/index.js';

/**
 * Record command - record past audio from voice channel
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('VC recording and recorder status')
    .setDescriptionLocalizations({
      ja: 'VC録音とレコーダー状態確認',
    })
    .addSubcommand((sub) =>
      sub
        .setName('record')
        .setDescription('Record recent audio from your current voice channel')
        .setDescriptionLocalizations({
          ja: '現在参加中のVCの少し前の音声を録音',
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
              {
                name: '30 seconds',
                name_localizations: { ja: '30秒' },
                value: '30s',
              },
              {
                name: '1 minute',
                name_localizations: { ja: '1分' },
                value: '1m',
              },
              {
                name: '2 minutes',
                name_localizations: { ja: '2分' },
                value: '2m',
              },
              {
                name: '3 minutes',
                name_localizations: { ja: '3分' },
                value: '3m',
              },
              {
                name: '5 minutes (max)',
                name_localizations: { ja: '5分（最大）' },
                value: '5m',
              }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Show recorder capacity and active connections')
        .setDescriptionLocalizations({
          ja: '録音の接続数と上限を表示',
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
      description: t('record.statusHint', locale),
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
