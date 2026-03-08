import type { CommandCategory } from '../helpCatalog.js';

export const generalHelpCategory: CommandCategory = {
  name: { en: 'General', ja: '一般' },
  commands: [
    {
      name: 'general',
      description: {
        en: 'General utility and help commands',
        ja: '一般ユーティリティとヘルプ',
      },
      usage: '/general help, /general ping',
    },
  ],
};
