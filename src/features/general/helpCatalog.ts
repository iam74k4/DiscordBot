import type { CommandCategory } from '../helpCatalog.js';

export const generalHelpCategory: CommandCategory = {
  name: { en: 'General', ja: '一般' },
  commands: [
    {
      name: 'ping',
      description: {
        en: 'Check bot latency',
        ja: 'Botのレイテンシを確認',
      },
    },
    {
      name: 'help',
      description: {
        en: 'Show command list',
        ja: 'コマンド一覧を表示',
      },
    },
  ],
};
