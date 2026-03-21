import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const communityHelpCategory: CommandCategory = {
  name: { en: 'Community', ja: 'コミュニティ' },
  commands: [
    {
      name: 'roulette',
      description: {
        en: 'Random selection from voice channel',
        ja: 'ボイスチャンネルからランダム選択',
      },
      usage: '/roulette member, /roulette team',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(communityHelpCategory);
