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
        en: 'Show recorder capacity, buffer window, and auto-join state',
        ja: '録音の接続数・保持時間・自動参加の状態を表示',
      },
      usage: '/voice status',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'voice autojoin',
      description: {
        en: 'Choose which voice channels the bot may buffer audio in',
        ja: '音声を保持するVCの範囲を設定（除外・停止）',
      },
      usage: '/voice autojoin <enable|disable|exclude|include>',
      requiredPermission: 'manageGuild',
    },
  ],
};

registerHelpCategory(voiceHelpCategory);
