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
      name: 'notification steam me',
      description: {
        en: 'Check or change your personal Steam notification preference',
        ja: '自分用のSteam通知設定を確認・変更',
      },
      usage: '/notification steam me [action]',
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
    {
      name: 'notification steam setup',
      description: {
        en: 'Set the Steam game notification channel',
        ja: 'Steamゲーム通知チャンネルを設定',
      },
      usage: '/notification steam setup <channel>',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification steam status',
      description: {
        en: 'Show Steam notification settings for this server',
        ja: 'このサーバーのSteam通知設定を表示',
      },
      usage: '/notification steam status',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification steam enable',
      description: {
        en: 'Enable Steam notifications for this server',
        ja: 'このサーバーのSteam通知を有効化',
      },
      usage: '/notification steam enable',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification steam disable',
      description: {
        en: 'Disable Steam notifications for this server',
        ja: 'このサーバーのSteam通知を無効化',
      },
      usage: '/notification steam disable',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'notification steam remove',
      description: {
        en: 'Delete Steam notification settings for this server',
        ja: 'このサーバーのSteam通知設定を完全に削除',
      },
      usage: '/notification steam remove',
      requiredPermission: 'manageGuild',
    },
  ],
};

registerHelpCategory(notificationHelpCategory);
