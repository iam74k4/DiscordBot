import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import { logger } from '../utils/logger.js';

/** Normalize directory path to end with / */
function normalizeDirPath(value: string): string {
  const trimmed = value.trim().replace(/\\/g, '/');
  return trimmed.endsWith('/') ? trimmed : trimmed + '/';
}

// Load environment variables from .env file
dotenvConfig();

/**
 * Required environment variables (must be set for the bot to start)
 */
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'] as const;

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
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please check your .env file.`
    );
  }

  // Warn about optional but recommended variables
  if (!process.env.STEAM_API_KEY) {
    logger.warn(
      'STEAM_API_KEY is not set. Steam-related commands will not work.'
    );
  }
  if (!process.env.GITHUB_TOKEN) {
    logger.warn(
      'GITHUB_TOKEN is not set. GitHub-related commands will not work.'
    );
  }

  // Validate webhook URL format if provided
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      const url = new URL(process.env.ALERT_WEBHOOK_URL);
      if (!url.protocol.startsWith('https')) {
        logger.warn('ALERT_WEBHOOK_URL should use HTTPS');
      }
    } catch {
      throw new Error('ALERT_WEBHOOK_URL is not a valid URL');
    }
  }

  // Validate NODE_ENV value
  const validEnvs = ['development', 'production'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    logger.warn(
      `NODE_ENV "${process.env.NODE_ENV}" is not recognized. Valid values: ${validEnvs.join(', ')}`
    );
    process.env.NODE_ENV = 'development';
  }
}

/**
 * Validate numerical configuration values
 */
function validateNumericalConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxRec = parseNumber(process.env.MAX_RECORDING_DURATION, 300);
  const bufferDur = parseNumber(process.env.AUDIO_BUFFER_DURATION, 600);
  const memBuf = parseNumber(process.env.AUDIO_MEMORY_BUFFER_DURATION, 120);
  const maxVc = parseNumber(process.env.MAX_CONCURRENT_VC_CONNECTIONS, 5);
  const retentionHrs = parseNumber(process.env.RECORDING_RETENTION_HOURS, 24);
  const backupDays = parseNumber(process.env.BACKUP_RETENTION_DAYS, 7);
  const playtimeRetentionDays = parseNumber(
    process.env.PLAYTIME_HISTORY_RETENTION_DAYS,
    365
  );
  const voiceSessionRetentionDays = parseNumber(
    process.env.VOICE_SESSION_RETENTION_DAYS,
    30
  );
  const auditLogRetentionDays = parseNumber(
    process.env.AUDIT_LOG_RETENTION_DAYS,
    90
  );

  if (maxRec <= 0) {
    errors.push('MAX_RECORDING_DURATION must be > 0');
  }
  if (bufferDur < maxRec) {
    warnings.push(
      `AUDIO_BUFFER_DURATION (${bufferDur}) should be >= MAX_RECORDING_DURATION (${maxRec})`
    );
  }
  if (memBuf <= 0) {
    errors.push('AUDIO_MEMORY_BUFFER_DURATION must be > 0');
  }
  if (memBuf > bufferDur) {
    errors.push(
      `AUDIO_MEMORY_BUFFER_DURATION (${memBuf}) must be <= AUDIO_BUFFER_DURATION (${bufferDur})`
    );
  }
  if (maxVc <= 0 || maxVc > 100) {
    errors.push('MAX_CONCURRENT_VC_CONNECTIONS must be between 1 and 100');
  }
  if (retentionHrs <= 0) {
    errors.push('RECORDING_RETENTION_HOURS must be > 0');
  }
  if (backupDays <= 0) {
    errors.push('BACKUP_RETENTION_DAYS must be > 0');
  }
  if (playtimeRetentionDays <= 0) {
    errors.push('PLAYTIME_HISTORY_RETENTION_DAYS must be > 0');
  }
  if (voiceSessionRetentionDays <= 0) {
    errors.push('VOICE_SESSION_RETENTION_DAYS must be > 0');
  }
  if (auditLogRetentionDays <= 0) {
    errors.push('AUDIT_LOG_RETENTION_DAYS must be > 0');
  }

  for (const w of warnings) {
    logger.warn(`Config validation: ${w}`);
  }

  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${errors.join('; ')}`);
  }
}

// Validate on import
validateEnv();
validateNumericalConfig();

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

  /** Steam Web API key (optional — Steam commands require this) */
  STEAM_API_KEY: process.env.STEAM_API_KEY || '',

  /** GitHub Personal Access Token (optional — GitHub commands require this) */
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',

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

  // -----------------------------------------------------------
  // Voice recording (operational tuning)
  // -----------------------------------------------------------
  /** Maximum recording duration in seconds (default: 300 = 5 minutes) */
  MAX_RECORDING_DURATION: parseNumber(process.env.MAX_RECORDING_DURATION, 300),
  /** Audio buffer duration in seconds (default: 600 = 10 minutes) */
  AUDIO_BUFFER_DURATION: parseNumber(process.env.AUDIO_BUFFER_DURATION, 600),
  /** Memory buffer duration in seconds (default: 120 = 2 minutes) */
  AUDIO_MEMORY_BUFFER_DURATION: parseNumber(
    process.env.AUDIO_MEMORY_BUFFER_DURATION,
    120
  ),
  /** Maximum concurrent VC connections (default: 5) */
  MAX_CONCURRENT_VC_CONNECTIONS: parseNumber(
    process.env.MAX_CONCURRENT_VC_CONNECTIONS,
    5
  ),
  /** Recording file retention hours (default: 24) */
  RECORDING_RETENTION_HOURS: parseNumber(
    process.env.RECORDING_RETENTION_HOURS,
    24
  ),
  /** Steam playtime history retention days (default: 365) */
  PLAYTIME_HISTORY_RETENTION_DAYS: parseNumber(
    process.env.PLAYTIME_HISTORY_RETENTION_DAYS,
    365
  ),
  /** Voice session retention days (default: 30) */
  VOICE_SESSION_RETENTION_DAYS: parseNumber(
    process.env.VOICE_SESSION_RETENTION_DAYS,
    30
  ),
  /** Audit log retention days (default: 90) */
  AUDIT_LOG_RETENTION_DAYS: parseNumber(
    process.env.AUDIT_LOG_RETENTION_DAYS,
    90
  ),

  // -----------------------------------------------------------
  // Data directories (environment-dependent paths)
  // -----------------------------------------------------------
  /** Base data directory (default: data/) */
  DATA_DIR: normalizeDirPath(process.env.DATA_DIR || 'data/'),
  /** Database file path (default: data/bot.db) */
  DATABASE_PATH: process.env.DATABASE_PATH || join('data', 'bot.db'),
  /** Recordings directory (default: data/recordings/) */
  RECORDINGS_DIR: normalizeDirPath(
    process.env.RECORDINGS_DIR || 'data/recordings/'
  ),
  /** Disk buffer directory (default: data/buffers/) */
  AUDIO_DISK_BUFFER_DIR: normalizeDirPath(
    process.env.AUDIO_DISK_BUFFER_DIR || 'data/buffers/'
  ),

  // -----------------------------------------------------------
  // Backup settings
  // -----------------------------------------------------------
  /** Backup directory (default: data/backups/) */
  BACKUP_DIR: normalizeDirPath(
    process.env.BACKUP_DIR || 'data/backups/'
  ),
  /** Backup retention days (default: 7) */
  BACKUP_RETENTION_DAYS: parseNumber(process.env.BACKUP_RETENTION_DAYS, 7),
  /** Backup cron schedule (default: 0 4 * * * = daily at 4am) */
  BACKUP_CRON: process.env.BACKUP_CRON || '0 4 * * *',

  // -----------------------------------------------------------
  // Timezone
  // -----------------------------------------------------------
  /** Timezone (default: UTC) */
  TZ: process.env.TZ || 'UTC',

  // -----------------------------------------------------------
  // Alert settings (optional)
  // -----------------------------------------------------------
  /** Discord Webhook URL for alerts (optional) */
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',

  // -----------------------------------------------------------
  // Logging
  // -----------------------------------------------------------
  /** Log level: debug | info | warn | error (default: info in prod, debug in dev) */
  LOG_LEVEL: process.env.LOG_LEVEL || '',
} as const;

/**
 * Check if a user is a bot owner
 */
export function isBotOwner(userId: string): boolean {
  return env.BOT_OWNER_IDS.includes(userId);
}
