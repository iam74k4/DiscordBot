import type { CommandCategory } from '../helpCatalog.js';

export const pollHelpCategory: CommandCategory = {
  name: { en: 'Poll', ja: '投票' },
  commands: [
    {
      name: 'poll',
      description: {
        en: 'Create and manage polls',
        ja: '投票の作成と管理',
      },
      usage: '/poll create, /poll end',
    },
  ],
};
