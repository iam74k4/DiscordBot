/**
 * Section titles (no icons, text only)
 * Note: For localized titles, use the locales system with t()
 */
export const TITLES = {
  PROFILE: 'Steam Profile',
  PLAYTIME: 'Playtime Stats',
  GAMES: 'Game Library',
  RECENT: 'Recent Activity',
  RANKING: 'Server Ranking',
  HISTORY: 'Playtime History',
  CHART: 'Playtime Chart',
  HISTORY_GRAPH: 'Playtime Graph',
  SERVER_STATS: 'Server Statistics',
  REGISTER: 'Account Linked',
  UNREGISTER: 'Account Unlinked',
  WHOAMI: 'Linked Account',
  HELP: 'Steam Commands',
  NOTIFY: 'Notifications',
  NOTIFY_ME: 'Your Notifications',
  NOW_PLAYING: 'Now Playing',
  ERROR: 'Error',
  WARNING: 'Warning',
  NOT_FOUND: 'Not Found',
  PRIVATE_PROFILE: 'Private Profile',
  LOADING: 'Loading...',
} as const;

/**
 * Progress bar characters
 */
export const PROGRESS_BAR = {
  FILLED: '█',
  EMPTY: '░',
  LENGTH: 10,
} as const;
