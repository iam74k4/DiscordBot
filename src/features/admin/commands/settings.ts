import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeSettingsCommand } from '../application/index.js';

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Server settings management')
    .setDescriptionLocalizations({
      ja: 'サーバー設定の管理',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View current settings')
        .setDescriptionLocalizations({
          ja: '現在の設定を表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('audit')
        .setDescription('Set audit log channel')
        .setDescriptionLocalizations({
          ja: '監査ログチャンネルを設定',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for audit logs (leave empty to disable)')
            .setDescriptionLocalizations({
              ja: '監査ログを送信するチャンネル（空で無効化）',
            })
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('logs')
        .setDescription('View recent audit logs')
        .setDescriptionLocalizations({
          ja: '最近の監査ログを表示',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('language')
        .setDescription('Set server default language')
        .setDescriptionLocalizations({
          ja: 'サーバーのデフォルト言語を設定',
        })
        .addStringOption((opt) =>
          opt
            .setName('lang')
            .setDescription('Language')
            .setDescriptionLocalizations({
              ja: '言語',
            })
            .setRequired(true)
            .addChoices(
              { name: 'English', value: 'en' },
              { name: '日本語', value: 'ja' }
            )
        )
    ),

  async execute(interaction) {
    await executeSettingsCommand(interaction);
  },
};

export default command;
