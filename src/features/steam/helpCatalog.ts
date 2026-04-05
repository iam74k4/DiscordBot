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
        en: 'Profiles, playtime trends, account linking, and server rankings',
        ja: 'プロフィール確認、プレイ時間推移、連携、サーバーランキング',
      },
      usage:
        '/steam user profile, /steam user playtime, /steam user games, /steam user recent, /steam stats ranking, /steam stats history, /steam stats chart, /steam stats history-graph, /steam account register, /steam account unregister, /steam account whoami, /steam server stats, /steam info help',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(steamHelpCategory);
