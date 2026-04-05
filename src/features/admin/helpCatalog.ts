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
        en: 'Server settings and member role tools for moderators',
        ja: '管理者向けのサーバー設定とロール操作',
      },
      usage:
        '/admin settings view, /admin settings language, /admin settings audit, /admin settings logs, /admin role add, /admin role remove\nInteractive panels: `/admin settings view`, `/admin settings logs`',
      requiredPermission: ['manageGuild', 'manageRoles'],
    },
    {
      name: 'owner',
      description: {
        en: 'Bot owner tools for system status, backups, and owner broadcasts',
        ja: 'Botオーナー向けの状態確認、バックアップ、一斉通知',
      },
      usage:
        '/owner system stats, /owner system db, /owner system guilds, /owner system broadcast, /owner system health, /owner system metrics, /owner backup list, /owner backup run\nInteractive panels: `/owner system stats`, `/owner backup list`',
      requiredPermission: ['owner'],
    },
  ],
};

registerHelpCategory(adminHelpCategory);
