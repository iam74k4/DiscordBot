import { ColorResolvable } from 'discord.js';

/**
 * Discord Embed colors
 */
export const COLORS = {
  /** Discord Blurple - Primary brand color */
  PRIMARY: 0x5865f2 as ColorResolvable,
  /** Green - Success messages */
  SUCCESS: 0x57f287 as ColorResolvable,
  /** Red - Error messages */
  ERROR: 0xed4245 as ColorResolvable,
  /** Yellow - Warning messages */
  WARNING: 0xfee75c as ColorResolvable,
  /** Blue - Info messages */
  INFO: 0x5865f2 as ColorResolvable,
  /** Steam brand color */
  STEAM: 0x1b2838 as ColorResolvable,
  /** Steam online color */
  STEAM_ONLINE: 0x57cbde as ColorResolvable,
  /** Steam offline color */
  STEAM_OFFLINE: 0x898989 as ColorResolvable,
  /** Steam in-game color */
  STEAM_INGAME: 0x90ba3c as ColorResolvable,
} as const;

/**
 * Default cooldown in milliseconds
 */
export const DEFAULT_COOLDOWN = 3000;

/**
 * Bot metadata
 */
export const BOT_INFO = {
  NAME: 'Discord Bot',
  VERSION: '1.0.0',
} as const;

/**
 * Steam status indicators (text-based, minimal)
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

/**
 * Section titles (no icons, text only)
 */
export const TITLES = {
  PROFILE: 'Steam Profile',
  PLAYTIME: 'Playtime Stats',
  GAMES: 'Game Library',
  RECENT: 'Recent Activity',
  RANKING: 'Server Ranking',
  HISTORY: 'Playtime History',
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
