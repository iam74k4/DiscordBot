import { registerHelpCategory, type CommandCategory } from '../helpCatalog.js';

export const adminHelpCategory: CommandCategory = {
  name: { en: 'Admin', ja: '管理者' },
  commands: [
    {
      name: 'admin',
      description: {
        en: 'Server settings and bot administration commands',
        ja: 'サーバー設定とBot管理コマンド',
      },
      usage:
        '/admin settings view, /admin settings language, /admin settings audit, /admin settings logs, /admin system stats, /admin system db, /admin system guilds, /admin system broadcast, /admin system health, /admin system metrics, /admin backup list, /admin backup run',
    },
  ],
};

registerHelpCategory(adminHelpCategory);
