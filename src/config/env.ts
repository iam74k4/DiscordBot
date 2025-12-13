import { config as dotenvConfig } from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables from .env file
dotenvConfig();

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'STEAM_API_KEY',
] as const;

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('Please check your .env file');
    process.exit(1);
  }
}

// Validate on import
validateEnv();

/**
 * Environment configuration
 */
export const env = {
  /** Discord bot token */
  DISCORD_TOKEN: process.env.DISCORD_TOKEN!,

  /** Discord application client ID */
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,

  /** Discord guild ID for development (optional) */
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || null,

  /** Steam Web API key */
  STEAM_API_KEY: process.env.STEAM_API_KEY!,

  /** Current environment */
  NODE_ENV: (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production',

  /** Check if in development mode */
  isDevelopment: process.env.NODE_ENV !== 'production',

  /** Check if in production mode */
  isProduction: process.env.NODE_ENV === 'production',
} as const;
