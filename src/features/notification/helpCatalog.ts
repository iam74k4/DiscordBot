import { registerHelpCategory, type CommandCategory } from '../helpCatalog.js';

export const notificationHelpCategory: CommandCategory = {
  name: { en: 'Notification', ja: '通知' },
  commands: [
    {
      name: 'notification',
      description: {
        en: 'VC join/leave notifications, member join notifications, and VC time stats',
        ja: 'VC入退室通知、メンバー参加通知、VC滞在時間統計',
      },
      usage:
        '/notification voice set, /notification welcome set, /notification status, /notification stats',
    },
  ],
};

registerHelpCategory(notificationHelpCategory);
