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
 * Chart colors (dark theme for Discord)
 */
export const CHART_COLORS = {
  /** Discord dark background */
  BACKGROUND: '#2f3136',
  /** Discord text color */
  TEXT: '#dcddde',
  /** Grid line color */
  GRID: '#40444b',
  /** Chart color palette */
  PALETTE: [
    '#5865f2', // Discord Blurple
    '#57f287', // Green
    '#fee75c', // Yellow
    '#ed4245', // Red
    '#eb459e', // Pink
    '#9b59b6', // Purple
    '#3498db', // Blue
    '#1abc9c', // Teal
  ],
} as const;

