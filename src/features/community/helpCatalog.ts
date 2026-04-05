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
        en: 'Quick polls and VC roulette for casual group activities',
        ja: '投票作成とVCルーレットで気軽なグループ進行を支援',
      },
      usage:
        '/community poll create, /community poll end, /community roulette member, /community roulette team',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(communityHelpCategory);
