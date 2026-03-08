import { registerHelpCategory, type CommandCategory } from '../helpCatalog.js';

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
    },
  ],
};

registerHelpCategory(communityHelpCategory);
