import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeNotificationCommand } from '../application/index.js';

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Game notification settings')
    .setDescriptionLocalizations({
      ja: 'ゲーム通知設定',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // Setup
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set the notification channel')
        .setDescriptionLocalizations({
          ja: '通知チャンネルを設定',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send notifications to')
            .setDescriptionLocalizations({
              ja: '通知を送信するチャンネル',
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Status
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Check notification settings')
        .setDescriptionLocalizations({
          ja: '通知設定を確認',
        })
    )
    // Enable
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable notifications')
        .setDescriptionLocalizations({
          ja: '通知を有効化',
        })
    )
    // Disable
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable notifications')
        .setDescriptionLocalizations({
          ja: '通知を無効化',
        })
    )
    // Remove
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove notification settings')
        .setDescriptionLocalizations({
          ja: '通知設定を削除',
        })
    )
    // Me (personal settings)
    .addSubcommand((sub) =>
      sub
        .setName('me')
        .setDescription('Toggle your personal notification settings')
        .setDescriptionLocalizations({
          ja: '個人の通知設定を切り替え',
        })
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setDescriptionLocalizations({
              ja: '実行するアクション',
            })
            .addChoices(
              { name: 'Status - Check your settings', value: 'status' },
              { name: 'On - Enable notifications', value: 'on' },
              { name: 'Off - Disable notifications', value: 'off' }
            )
        )
    ),

  async execute(interaction) {
    await executeNotificationCommand(interaction);
  },
};

export default command;
