import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const adminHelpCategory: CommandCategory = {
  name: { en: 'Admin', ja: '管理者' },
  commands: [
    {
      name: 'admin',
      description: {
        en: 'Server settings and role management (Manage Server)',
        ja: 'サーバー設定とロール管理（サーバー管理権限が必要）',
      },
      usage:
        '/admin settings view, /admin settings language, /admin settings audit, /admin settings logs, /admin role add, /admin role remove\nInteractive panels: `/admin settings view`, `/admin settings logs`',
      requiredPermission: ['manageGuild', 'manageRoles'],
    },
    {
      name: 'owner',
      description: {
        en: 'Bot owner tools (statistics, backups, broadcast to guild owners)',
        ja: 'Botオーナー向け（統計・バックアップ・オーナーへの一斉通知など）',
      },
      usage:
        '/owner system stats, /owner system db, /owner system guilds, /owner system broadcast, /owner system health, /owner system metrics, /owner backup list, /owner backup run\nInteractive panels: `/owner system stats`, `/owner backup list`',
      requiredPermission: ['owner'],
    },
  ],
};

registerHelpCategory(adminHelpCategory);
