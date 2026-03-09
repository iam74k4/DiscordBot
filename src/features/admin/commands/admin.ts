import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import {
  executeAdminCommand,
  executeRoleCommand,
  executeSettingsCommand,
} from '../application/index.js';

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Server settings and bot administration commands')
    .setDescriptionLocalizations({
      ja: 'サーバー設定とBot管理コマンド',
    })
    .addSubcommandGroup((group) =>
      group
        .setName('settings')
        .setDescription('Server settings management')
        .setDescriptionLocalizations({
          ja: 'サーバー設定の管理',
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
                  { name: '日本語', value: 'ja' }
                )
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('system')
        .setDescription('Bot owner system tools')
        .setDescriptionLocalizations({
          ja: 'Botオーナー向けシステム機能',
        })
        .addSubcommand((sub) =>
          sub
            .setName('stats')
            .setDescription('View bot statistics')
            .setDescriptionLocalizations({
              ja: 'Bot統計を表示',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('db')
            .setDescription('View database statistics')
            .setDescriptionLocalizations({
              ja: 'データベース統計を表示',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('guilds')
            .setDescription('List servers the bot is in')
            .setDescriptionLocalizations({
              ja: 'Botが参加しているサーバー一覧',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('broadcast')
            .setDescription('Send a message to all server owners')
            .setDescriptionLocalizations({
              ja: '全サーバーオーナーにメッセージを送信',
            })
            .addStringOption((opt) =>
              opt
                .setName('message')
                .setDescription('Message to broadcast')
                .setDescriptionLocalizations({
                  ja: '送信するメッセージ',
                })
                .setRequired(true)
                .setMaxLength(2000)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('health')
            .setDescription('View system health status')
            .setDescriptionLocalizations({
              ja: 'システムヘルスステータスを表示',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('metrics')
            .setDescription('View bot usage metrics')
            .setDescriptionLocalizations({
              ja: 'Bot使用メトリクスを表示',
            })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('backup')
        .setDescription('Backup management tools')
        .setDescriptionLocalizations({
          ja: 'バックアップ管理',
        })
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('List database backups')
            .setDescriptionLocalizations({
              ja: 'データベースバックアップ一覧',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('run')
            .setDescription('Run a manual database backup')
            .setDescriptionLocalizations({
              ja: '手動でデータベースバックアップを実行',
            })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('role')
        .setDescription('Assign or remove roles from members')
        .setDescriptionLocalizations({
          ja: 'メンバーにロールを付与・剥奪',
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

    await executeAdminCommand(interaction);
  },
};

export default command;
