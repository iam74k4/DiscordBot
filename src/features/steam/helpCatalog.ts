import { registerHelpCategory, type CommandCategory } from '../helpCatalog.js';

export const steamHelpCategory: CommandCategory = {
  name: { en: 'Steam', ja: 'Steam' },
  commands: [
    {
      name: 'steam',
      description: {
        en: 'Steam profiles, stats, notifications, and server info',
        ja: 'Steamプロフィール、統計、通知、サーバー情報',
      },
      usage:
        '/steam user profile, /steam user playtime, /steam user games, /steam user recent, /steam stats ranking, /steam stats history, /steam stats chart, /steam stats history-graph, /steam account register, /steam account unregister, /steam account whoami, /steam notifications setup, /steam notifications status, /steam notifications enable, /steam notifications disable, /steam notifications remove, /steam notifications me, /steam server stats, /steam info help',
    },
  ],
};

registerHelpCategory(steamHelpCategory);
