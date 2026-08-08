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
} as const;
