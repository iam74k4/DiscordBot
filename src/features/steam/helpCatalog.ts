import type { CommandCategory } from '../helpCatalog.js';

export const steamHelpCategory: CommandCategory = {
  name: { en: 'Steam', ja: 'Steam' },
  commands: [
    {
      name: 'steam',
      description: {
        en: 'Steam profile and statistics',
        ja: 'Steamプロフィールと統計',
      },
      usage:
        '/steam profile, /steam playtime, /steam games, /steam recent, /steam ranking, /steam history, /steam chart, /steam history-graph, /steam register, /steam unregister, /steam whoami, /steam help',
    },
    {
      name: 'notify',
      description: {
        en: 'Game launch notifications',
        ja: 'ゲーム起動通知',
      },
      usage:
        '/notify setup, /notify status, /notify enable, /notify disable, /notify remove, /notify me',
    },
    {
      name: 'server',
      description: {
        en: 'Display server information',
        ja: 'サーバー情報を表示',
      },
      usage: '/server stats',
    },
  ],
};
