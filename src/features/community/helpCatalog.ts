import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const communityHelpCategory: CommandCategory = {
  name: { en: 'Community', ja: 'コミュニティ' },
  commands: [
    {
      name: 'community',
      description: {
        en: 'Community utilities for polls and roulette',
        ja: '投票とルーレットのコミュニティ機能',
      },
      usage:
        '/community poll create, /community poll end, /community roulette member, /community roulette team',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(communityHelpCategory);
