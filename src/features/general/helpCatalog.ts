import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const generalHelpCategory: CommandCategory = {
  name: { en: 'General', ja: '一般' },
  commands: [
    {
      name: 'general',
      description: {
        en: 'Start here for help, quick checks, and bot overview',
        ja: 'ヘルプ確認、簡単な動作確認、Bot概要の入口',
      },
      usage: '/general help, /general ping, /general about',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(generalHelpCategory);
