import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { executeAdminCommand } from '../application/index.js';

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot administration commands (owner only)')
    .setDescriptionLocalizations({
      ja: 'Bot管理コマンド（オーナー専用）',
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
        .setName('backup-list')
        .setDescription('List database backups')
        .setDescriptionLocalizations({
          ja: 'データベースバックアップ一覧',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('backup-run')
        .setDescription('Run a manual database backup')
        .setDescriptionLocalizations({
          ja: '手動でデータベースバックアップを実行',
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName('metrics')
        .setDescription('View bot usage metrics')
        .setDescriptionLocalizations({
          ja: 'Bot使用メトリクスを表示',
        })
    ),

  async execute(interaction) {
    await executeAdminCommand(interaction);
  },
};

export default command;
