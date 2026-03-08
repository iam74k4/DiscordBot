import type { CommandCategory } from '../helpCatalog.js';

export const adminHelpCategory: CommandCategory = {
  name: { en: 'Admin', ja: '管理者' },
  commands: [
    {
      name: 'settings',
      description: {
        en: 'Server settings management',
        ja: 'サーバー設定の管理',
      },
      usage:
        '/settings view, /settings language, /settings audit, /settings logs',
    },
    {
      name: 'admin',
      description: {
        en: 'Bot administration commands',
        ja: 'Bot管理コマンド',
      },
      usage:
        '/admin stats, /admin db, /admin guilds, /admin broadcast, /admin health, /admin backup-list, /admin backup-run, /admin metrics',
    },
  ],
};
