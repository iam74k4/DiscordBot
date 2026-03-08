import {
  getAllGameActivityCache,
  getEnabledNotificationGuilds,
  getGameActivityCache,
  getNotificationSettings,
  getUserNotificationPref,
  removeNotificationSettings,
  setNotificationChannel,
  setNotificationEnabled,
  setUserNotificationPref,
  updateGameActivityCache,
  type GameActivityCacheRecord,
  type NotificationSettingsRecord,
  type UserNotificationPrefsRecord,
} from '../../../services/database/notifications.js';

export type {
  GameActivityCacheRecord,
  NotificationSettingsRecord,
  UserNotificationPrefsRecord,
};

export const steamNotificationRepository = {
  getAllCachedGameActivity: getAllGameActivityCache,
  getEnabledGuilds: getEnabledNotificationGuilds,
  getGameActivityCache,
  getGuildSettings: getNotificationSettings,
  getUserPreference: getUserNotificationPref,
  removeGuildSettings: removeNotificationSettings,
  setChannel: setNotificationChannel,
  setGuildEnabled: setNotificationEnabled,
  setUserPreference: setUserNotificationPref,
  updateGameActivityCache,
};
