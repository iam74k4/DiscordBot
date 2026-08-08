import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import {
  executeRoleCommand,
  executeSettingsCommand,
} from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Server settings plus role tools for moderators')
    .setDescriptionLocalizations({
      ja: 'サーバー設定とロール操作の管理者コマンド',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName('settings')
        .setDescription('View and change this server configuration')
        .setDescriptionLocalizations({
          ja: 'このサーバーの設定を確認・変更',
        })
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
                .setDescription(
                  'Channel for audit logs (leave empty to disable)'
                )
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
                  { name: '日本語', value: 'ja' },
                  {
                    name: 'Automatic (follow each user)',
                    name_localizations: { ja: '自動（ユーザーに合わせる）' },
                    value: 'auto',
                  }
                )
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('role')
        .setDescription('Add or remove member roles')
        .setDescriptionLocalizations({
          ja: 'メンバーへのロール付与・剥奪',
        })
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a role to a member')
            .setDescriptionLocalizations({
              ja: 'メンバーにロールを付与',
            })
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Member to add the role to')
                .setDescriptionLocalizations({
                  ja: 'ロールを付与するメンバー',
                })
                .setRequired(true)
            )
            .addRoleOption((opt) =>
              opt
                .setName('role')
                .setDescription('Role to add')
                .setDescriptionLocalizations({
                  ja: '付与するロール',
                })
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a role from a member')
            .setDescriptionLocalizations({
              ja: 'メンバーからロールを剥奪',
            })
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Member to remove the role from')
                .setDescriptionLocalizations({
                  ja: 'ロールを剥奪するメンバー',
                })
                .setRequired(true)
            )
            .addRoleOption((opt) =>
              opt
                .setName('role')
                .setDescription('Role to remove')
                .setDescriptionLocalizations({
                  ja: '剥奪するロール',
                })
                .setRequired(true)
            )
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);

    if (group === 'settings') {
      await executeSettingsCommand(interaction);
      return;
    }

    if (group === 'role') {
      await executeRoleCommand(interaction);
      return;
    }
  },
};

export default command;
