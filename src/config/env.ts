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
 * Parse comma-separated IDs
 */
function parseOwnerIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Parse number from environment variable with default
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

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

  /** Bot owner IDs (comma-separated) */
  BOT_OWNER_IDS: parseOwnerIds(process.env.BOT_OWNER_IDS),

  /** Current environment */
  NODE_ENV: (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production',

  /** Check if in development mode */
  isDevelopment: process.env.NODE_ENV !== 'production',

  /** Check if in production mode */
  isProduction: process.env.NODE_ENV === 'production',

  // Voice recording configuration
  /** Maximum recording duration in seconds (default: 300 = 5 minutes) */
  MAX_RECORDING_DURATION: parseNumber(process.env.MAX_RECORDING_DURATION, 300),
  /** Audio buffer duration in seconds (default: 600 = 10 minutes) */
  AUDIO_BUFFER_DURATION: parseNumber(process.env.AUDIO_BUFFER_DURATION, 600),
  /** Memory buffer duration in seconds (default: 120 = 2 minutes) */
  AUDIO_MEMORY_BUFFER_DURATION: parseNumber(
    process.env.AUDIO_MEMORY_BUFFER_DURATION,
    120
  ),
  // Data directories
  /** Base data directory (default: data/) */
  DATA_DIR: process.env.DATA_DIR || 'data/',
  /** Database file path (default: data/bot.db) */
  DATABASE_PATH: process.env.DATABASE_PATH || 'data/bot.db',
  /** Recordings directory (default: data/recordings/) */
  RECORDINGS_DIR: process.env.RECORDINGS_DIR || 'data/recordings/',
  /** Disk buffer directory (default: data/buffers/) */
  AUDIO_DISK_BUFFER_DIR: process.env.AUDIO_DISK_BUFFER_DIR || 'data/buffers/',
  /** Discord max file size in MB (default: 25) */
  DISCORD_MAX_FILE_SIZE: parseNumber(process.env.DISCORD_MAX_FILE_SIZE, 25),
  /** Audio sample rate in Hz (default: 32000) */
  AUDIO_SAMPLE_RATE: parseNumber(process.env.AUDIO_SAMPLE_RATE, 32000),
  /** Audio bit depth (default: 16) */
  AUDIO_BIT_DEPTH: parseNumber(process.env.AUDIO_BIT_DEPTH, 16),
  /** Audio channels (default: 1 = mono) */
  AUDIO_CHANNELS: parseNumber(process.env.AUDIO_CHANNELS, 1),
  /** Recording file retention hours (default: 24) */
  RECORDING_RETENTION_HOURS: parseNumber(
    process.env.RECORDING_RETENTION_HOURS,
    24
  ),
  /** Maximum retry count (default: 3) */
  RECORDING_RETRY_MAX: parseNumber(process.env.RECORDING_RETRY_MAX, 3),
  /** Timezone (default: UTC) */
  TZ: process.env.TZ || 'UTC',
  /** Maximum concurrent VC connections (default: 5) */
  MAX_CONCURRENT_VC_CONNECTIONS: parseNumber(
    process.env.MAX_CONCURRENT_VC_CONNECTIONS,
    5
  ),
  /** Memory warning threshold in MB (default: 100) */
  MEMORY_WARNING_THRESHOLD_MB: parseNumber(
    process.env.MEMORY_WARNING_THRESHOLD_MB,
    100
  ),
  /** Memory critical threshold in MB (default: 150) */
  MEMORY_CRITICAL_THRESHOLD_MB: parseNumber(
    process.env.MEMORY_CRITICAL_THRESHOLD_MB,
    150
  ),
  /** Memory monitor interval in milliseconds (default: 60000 = 1 minute) */
  MEMORY_MONITOR_INTERVAL_MS: parseNumber(
    process.env.MEMORY_MONITOR_INTERVAL_MS,
    60000
  ),
  /** Disk buffer cleanup interval in milliseconds (default: 3600000 = 1 hour) */
  DISK_BUFFER_CLEANUP_INTERVAL_MS: parseNumber(
    process.env.DISK_BUFFER_CLEANUP_INTERVAL_MS,
    3600000
  ),
  /** Disk warning threshold in MB (default: 1000) */
  DISK_WARNING_THRESHOLD_MB: parseNumber(
    process.env.DISK_WARNING_THRESHOLD_MB,
    1000
  ),

  // Backup settings
  /** Backup directory (default: data/backups/) */
  BACKUP_DIR: process.env.BACKUP_DIR || 'data/backups/',
  /** Backup retention days (default: 7) */
  BACKUP_RETENTION_DAYS: parseNumber(process.env.BACKUP_RETENTION_DAYS, 7),
  /** Backup cron schedule (default: 0 4 * * * = daily at 4am) */
  BACKUP_CRON: process.env.BACKUP_CRON || '0 4 * * *',

  // Alert settings
  /** Discord Webhook URL for alerts (optional) */
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',
} as const;

/**
 * Check if a user is a bot owner
 */
export function isBotOwner(userId: string): boolean {
  return env.BOT_OWNER_IDS.includes(userId);
}
