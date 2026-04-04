import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const steamHelpCategory: CommandCategory = {
  name: { en: 'Steam', ja: 'Steam' },
  commands: [
    {
      name: 'steam',
      description: {
        en: 'Steam profiles, stats, account linking, and server info',
        ja: 'Steamプロフィール、統計、アカウント連携、サーバー情報',
      },
      usage:
        '/steam user profile, /steam user playtime, /steam user games, /steam user recent, /steam stats ranking, /steam stats history, /steam stats chart, /steam stats history-graph, /steam account register, /steam account unregister, /steam account whoami, /steam server stats, /steam info help',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(steamHelpCategory);
