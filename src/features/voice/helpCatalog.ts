import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const voiceHelpCategory: CommandCategory = {
  name: { en: 'Voice', ja: 'ボイス' },
  commands: [
    {
      name: 'voice record',
      description: {
        en: 'Record recent audio from your current VC, not notifications',
        ja: '現在のVCの最近の音声を録音（通知設定ではありません）',
      },
      usage: '/voice record <duration>',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'voice status',
      description: {
        en: 'Show recorder capacity and active VC connections',
        ja: '録音の接続数と利用上限を表示',
      },
      usage: '/voice status',
      requiredPermission: 'manageGuild',
    },
  ],
};

registerHelpCategory(voiceHelpCategory);
