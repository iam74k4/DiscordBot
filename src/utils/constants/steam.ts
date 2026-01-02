/**
 * Steam status indicators (text-based, minimal)
 * Note: For localized status text, use services/steam/utils.ts getStatusText()
 */
export const STEAM_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  AWAY: 'Away',
  BUSY: 'Busy',
  INGAME: 'In-Game',
  PRIVATE: 'Private',
  PUBLIC: 'Public',
} as const;
