import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import {
  executeAutoJoinCommand,
  executeRecordCommand,
} from '../application/index.js';
import { voiceSettingsRepository } from '../repositories/voiceSettingsRepository.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { connectionManager } from '../recording/connectionManager.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
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
    )
    .addSubcommandGroup((group) =>
      group
        .setName('autojoin')
        .setDescription('Control which channels the bot buffers audio in')
        .setDescriptionLocalizations({
          ja: '音声を保持するチャンネルの設定',
        })
        .addSubcommand((sub) =>
          sub
            .setName('enable')
            .setDescription('Let the bot join occupied voice channels')
            .setDescriptionLocalizations({
              ja: '人がいるVCへの自動参加を有効化',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('disable')
            .setDescription('Stop the bot joining and buffering entirely')
            .setDescriptionLocalizations({
              ja: '自動参加と音声保持を停止',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('exclude')
            .setDescription('Keep the bot out of one voice channel')
            .setDescriptionLocalizations({
              ja: '特定のVCを対象外にする',
            })
            .addChannelOption((option) =>
              option
                .setName('channel')
                .setDescription('Voice channel to exclude')
                .setDescriptionLocalizations({ ja: '対象外にするVC' })
                .addChannelTypes(
                  ChannelType.GuildVoice,
                  ChannelType.GuildStageVoice
                )
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('include')
            .setDescription('Remove a voice channel from the exclusion list')
            .setDescriptionLocalizations({
              ja: '対象外の設定を解除',
            })
            .addChannelOption((option) =>
              option
                .setName('channel')
                .setDescription('Voice channel to include again')
                .setDescriptionLocalizations({ ja: '対象に戻すVC' })
                .addChannelTypes(
                  ChannelType.GuildVoice,
                  ChannelType.GuildStageVoice
                )
                .setRequired(true)
            )
        )
    ) as SlashCommandBuilder,

  middleware: ['permissions', 'cooldown'],

  options: {
    permissions: [PermissionFlagsBits.ManageGuild],
    cooldown: 10000, // 10 seconds cooldown
  },

  async execute(interaction) {
    if (interaction.options.getSubcommandGroup(false) === 'autojoin') {
      await executeAutoJoinCommand(interaction);
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'record') {
      await executeRecordCommand(interaction);
      return;
    }

    const locale = resolveLocale(interaction);
    const activeConnections = connectionManager.getConnectionCount();
    const guildId = interaction.guildId;

    const autoJoinEnabled = guildId
      ? voiceSettingsRepository.isAutoJoinEnabled(guildId)
      : false;
    const exclusions = guildId
      ? voiceSettingsRepository.listExclusions(guildId)
      : [];

    // Whether the caller's own channel is being buffered right now is the
    // question people actually have when they run this.
    const memberChannelId =
      interaction.member && 'voice' in interaction.member
        ? (interaction.member.voice.channelId ?? null)
        : null;

    let currentChannelState: string;
    if (!memberChannelId || !guildId) {
      currentChannelState = t('record.autojoin.currentChannelNone', locale);
    } else if (
      voiceSettingsRepository.isChannelExcluded(guildId, memberChannelId)
    ) {
      currentChannelState = t('record.autojoin.currentChannelExcluded', locale);
    } else if (connectionManager.getConnection(memberChannelId)) {
      currentChannelState = t('record.autojoin.currentChannelBuffered', locale);
    } else {
      currentChannelState = t('record.autojoin.currentChannelNone', locale);
    }

    const embed = createEmbed({
      title: locale === 'ja' ? 'ボイス機能の状態' : 'Voice subsystem status',
      description: `${t('record.statusHint', locale)}\n\n${currentChannelState}`,
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
        {
          name: t('record.bufferWindow', locale),
          value: `${Math.round(env.AUDIO_BUFFER_DURATION / 60)} min`,
          inline: true,
        },
        {
          name: t('record.autojoin.title', locale),
          value: autoJoinEnabled
            ? t('record.autojoin.statusEnabled', locale)
            : t('record.autojoin.statusDisabled', locale),
          inline: true,
        },
        {
          name: t('record.autojoin.exclusionCount', locale),
          value: String(exclusions.length),
          inline: true,
        },
      ],
    });
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
