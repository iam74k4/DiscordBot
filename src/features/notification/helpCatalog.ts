import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const notificationHelpCategory: CommandCategory = {
  name: { en: 'Notification', ja: '通知' },
  commands: [
    {
      name: 'notification stats',
      description: {
        en: 'Show your own VC time statistics',
        ja: '自分のVC滞在時間統計を表示',
      },
      usage: '/notification stats [period]',
      requiredPermission: 'everyone',
    },
    {
      name: 'notification status',
      description: {
        en: 'Show the server notification settings panel',
        ja: 'サーバー通知設定パネルを表示',
      },
      usage: '/notification status',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification voice set',
      description: {
        en: 'Set the VC join/leave notification channel, not recording',
        ja: 'VC入退室通知チャンネルを設定（録音ではありません）',
      },
      usage: '/notification voice set <channel>',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification voice disable',
      description: {
        en: 'Disable VC join/leave notifications',
        ja: 'VC入退室通知を無効化',
      },
      usage: '/notification voice disable',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification welcome set',
      description: {
        en: 'Set the member join notification channel',
        ja: 'メンバー参加通知チャンネルを設定',
      },
      usage: '/notification welcome set <channel>',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification welcome disable',
      description: {
        en: 'Disable member join notifications',
        ja: 'メンバー参加通知を無効化',
      },
      usage: '/notification welcome disable',
      requiredPermission: 'manageGuild',
    },
  ],
};

registerHelpCategory(notificationHelpCategory);
