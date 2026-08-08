import { isAbsolute, join, relative, resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';
import { logger } from '../shared/utils/logger.js';

/** Normalize directory path to end with / */
function normalizeDirPath(value: string): string {
  const trimmed = value.trim().replace(/\\/g, '/');
  return trimmed.endsWith('/') ? trimmed : trimmed + '/';
}

// Load environment variables from .env file
dotenvConfig();

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

function isWithinWorkspaceRoot(baseDir: string, targetPath: string): boolean {
  const relativePath = relative(baseDir, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

function validateWorkspacePath(
  value: string,
  envKey: string,
  options: { directory: boolean }
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${envKey} must not be empty`);
  }
  if (trimmed.includes('\0')) {
    throw new Error(`${envKey} must not contain null bytes`);
  }
  if (isAbsolute(trimmed)) {
    throw new Error(`${envKey} must be a relative path inside the workspace`);
  }
  if (!options.directory && /[\\/]+$/.test(trimmed)) {
    throw new Error(`${envKey} must point to a file path`);
  }

  const workspaceRoot = resolve(process.cwd());
  const resolvedPath = resolve(workspaceRoot, trimmed);
  if (!isWithinWorkspaceRoot(workspaceRoot, resolvedPath)) {
    throw new Error(`${envKey} must stay within the workspace root`);
  }

  const relativePath = relative(workspaceRoot, resolvedPath).replace(
    /\\/g,
    '/'
  );
  if (!relativePath || relativePath === '.') {
    return options.directory ? './' : '.';
  }
  return options.directory ? normalizeDirPath(relativePath) : relativePath;
}

/**
 * Parse integer from environment variable with default.
 * If the variable is set to a non-empty value, it must be a valid integer.
 */
function parseNumber(
  value: string | undefined,
  defaultValue: number,
  envKey: string
): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid integer for environment variable ${envKey}: "${value}"`
    );
  }
  return parsed;
}

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

  // Validate webhook URL format if provided
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      const url = new URL(process.env.ALERT_WEBHOOK_URL);
      if (url.protocol !== 'https:') {
        throw new Error('ALERT_WEBHOOK_URL must use HTTPS');
      }
    } catch {
      throw new Error('ALERT_WEBHOOK_URL is not a valid HTTPS URL');
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

  const maxRec = parseNumber(
    process.env.MAX_RECORDING_DURATION,
    300,
    'MAX_RECORDING_DURATION'
  );
  const bufferDur = parseNumber(
    process.env.AUDIO_BUFFER_DURATION,
    600,
    'AUDIO_BUFFER_DURATION'
  );
  const maxVc = parseNumber(
    process.env.MAX_CONCURRENT_VC_CONNECTIONS,
    5,
    'MAX_CONCURRENT_VC_CONNECTIONS'
  );
  const retentionHrs = parseNumber(
    process.env.RECORDING_RETENTION_HOURS,
    24,
    'RECORDING_RETENTION_HOURS'
  );
  const backupDays = parseNumber(
    process.env.BACKUP_RETENTION_DAYS,
    7,
    'BACKUP_RETENTION_DAYS'
  );
  const voiceSessionRetentionDays = parseNumber(
    process.env.VOICE_SESSION_RETENTION_DAYS,
    30,
    'VOICE_SESSION_RETENTION_DAYS'
  );
  const auditLogRetentionDays = parseNumber(
    process.env.AUDIT_LOG_RETENTION_DAYS,
    90,
    'AUDIT_LOG_RETENTION_DAYS'
  );
  const shutdownTimeout = parseNumber(
    process.env.SHUTDOWN_TIMEOUT_MS,
    10_000,
    'SHUTDOWN_TIMEOUT_MS'
  );

  if (maxRec <= 0) {
    errors.push('MAX_RECORDING_DURATION must be > 0');
  }
  if (bufferDur < maxRec) {
    warnings.push(
      `AUDIO_BUFFER_DURATION (${bufferDur}) should be >= MAX_RECORDING_DURATION (${maxRec})`
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
  if (voiceSessionRetentionDays <= 0) {
    errors.push('VOICE_SESSION_RETENTION_DAYS must be > 0');
  }
  if (auditLogRetentionDays <= 0) {
    errors.push('AUDIT_LOG_RETENTION_DAYS must be > 0');
  }
  if (shutdownTimeout < 5_000 || shutdownTimeout > 120_000) {
    errors.push('SHUTDOWN_TIMEOUT_MS must be between 5000 and 120000');
  }

  for (const w of warnings) {
    logger.warn(`Config validation: ${w}`);
  }

  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${errors.join('; ')}`);
  }
}

/**
 * Bot owner IDs are required in production so /owner and alerts remain operable.
 */
function validateBotOwnerIds(): void {
  const ids = parseOwnerIds(process.env.BOT_OWNER_IDS);
  if (ids.length > 0) {
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BOT_OWNER_IDS must be set in production with at least one Discord user ID (comma-separated).'
    );
  }
  logger.warn(
    'BOT_OWNER_IDS is not set. The /owner command will reject everyone until you add at least one ID.'
  );
}

// Validate on import
validateEnv();
validateNumericalConfig();
validateBotOwnerIds();

const dataDir = validateWorkspacePath(
  process.env.DATA_DIR || 'data/',
  'DATA_DIR',
  { directory: true }
);
const databasePath = validateWorkspacePath(
  process.env.DATABASE_PATH || join('data', 'bot.db'),
  'DATABASE_PATH',
  { directory: false }
);
const recordingsDir = validateWorkspacePath(
  process.env.RECORDINGS_DIR || 'data/recordings/',
  'RECORDINGS_DIR',
  { directory: true }
);
const backupDir = validateWorkspacePath(
  process.env.BACKUP_DIR || 'data/backups/',
  'BACKUP_DIR',
  { directory: true }
);

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
  MAX_RECORDING_DURATION: parseNumber(
    process.env.MAX_RECORDING_DURATION,
    300,
    'MAX_RECORDING_DURATION'
  ),
  /**
   * Ring buffer length for `/voice record` (channel mix ring), in seconds
   * (default: 600 = 10 minutes).
   */
  AUDIO_BUFFER_DURATION: parseNumber(
    process.env.AUDIO_BUFFER_DURATION,
    600,
    'AUDIO_BUFFER_DURATION'
  ),
  /** Maximum concurrent VC connections (default: 5) */
  MAX_CONCURRENT_VC_CONNECTIONS: parseNumber(
    process.env.MAX_CONCURRENT_VC_CONNECTIONS,
    5,
    'MAX_CONCURRENT_VC_CONNECTIONS'
  ),
  /** Recording file retention hours (default: 24) */
  RECORDING_RETENTION_HOURS: parseNumber(
    process.env.RECORDING_RETENTION_HOURS,
    24,
    'RECORDING_RETENTION_HOURS'
  ),
  /** Voice session retention days (default: 30) */
  VOICE_SESSION_RETENTION_DAYS: parseNumber(
    process.env.VOICE_SESSION_RETENTION_DAYS,
    30,
    'VOICE_SESSION_RETENTION_DAYS'
  ),
  /** Audit log retention days (default: 90) */
  AUDIT_LOG_RETENTION_DAYS: parseNumber(
    process.env.AUDIT_LOG_RETENTION_DAYS,
    90,
    'AUDIT_LOG_RETENTION_DAYS'
  ),

  // -----------------------------------------------------------
  // Data directories (environment-dependent paths)
  // -----------------------------------------------------------
  /** Base data directory (default: data/) */
  DATA_DIR: dataDir,
  /** Database file path (default: data/bot.db) */
  DATABASE_PATH: databasePath,
  /** Recordings directory (default: data/recordings/) */
  RECORDINGS_DIR: recordingsDir,

  // -----------------------------------------------------------
  // Backup settings
  // -----------------------------------------------------------
  /** Backup directory (default: data/backups/) */
  BACKUP_DIR: backupDir,
  /** Backup retention days (default: 7) */
  BACKUP_RETENTION_DAYS: parseNumber(
    process.env.BACKUP_RETENTION_DAYS,
    7,
    'BACKUP_RETENTION_DAYS'
  ),
  /** Backup cron schedule (default: 0 4 * * * = daily at 4am) */
  BACKUP_CRON: process.env.BACKUP_CRON || '0 4 * * *',

  /** Run final backup before shutdown (default: true) */
  SHUTDOWN_FINAL_BACKUP: process.env.SHUTDOWN_FINAL_BACKUP !== 'false',

  /** Shutdown timeout in ms (default: 10000, range: 5000–120000) */
  SHUTDOWN_TIMEOUT_MS: parseNumber(
    process.env.SHUTDOWN_TIMEOUT_MS,
    10_000,
    'SHUTDOWN_TIMEOUT_MS'
  ),

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
