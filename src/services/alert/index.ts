import { env } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Alert severity levels
 */
export type AlertLevel = 'info' | 'warn' | 'error' | 'critical';

/**
 * Alert colors for Discord embeds
 */
const ALERT_COLORS: Record<AlertLevel, number> = {
  info: 0x3498db, // Blue
  warn: 0xf39c12, // Orange
  error: 0xe74c3c, // Red
  critical: 0x9b59b6, // Purple
};

/**
 * Alert level emojis
 */
const ALERT_EMOJIS: Record<AlertLevel, string> = {
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  critical: '🚨',
};

/**
 * Rate limiting: track recent alerts to prevent spam
 */
const recentAlerts = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a hash for an alert message
 */
function getAlertHash(level: AlertLevel, title: string): string {
  return `${level}:${title}`;
}

/**
 * Check if an alert should be rate limited
 */
function isRateLimited(level: AlertLevel, title: string): boolean {
  const hash = getAlertHash(level, title);
  const lastSent = recentAlerts.get(hash);

  if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) {
    return true;
  }

  return false;
}

/**
 * Record an alert as sent
 */
function recordAlert(level: AlertLevel, title: string): void {
  const hash = getAlertHash(level, title);
  recentAlerts.set(hash, Date.now());

  // Clean up old entries
  const cutoff = Date.now() - RATE_LIMIT_MS;
  for (const [key, timestamp] of recentAlerts.entries()) {
    if (timestamp < cutoff) {
      recentAlerts.delete(key);
    }
  }
}

/**
 * Send an alert to Discord webhook and/or log
 *
 * @param level - Alert severity level
 * @param title - Alert title
 * @param description - Alert description/details
 * @returns true if alert was sent, false if rate limited or failed
 */
export async function sendAlert(
  level: AlertLevel,
  title: string,
  description: string
): Promise<boolean> {
  // Check rate limiting
  if (isRateLimited(level, title)) {
    logger.debug(`Alert rate limited: ${title}`);
    return false;
  }

  // Always log the alert
  const logMessage = `[ALERT] ${ALERT_EMOJIS[level]} ${title}: ${description}`;
  switch (level) {
    case 'info':
      logger.info(logMessage);
      break;
    case 'warn':
      logger.warn(logMessage);
      break;
    case 'error':
    case 'critical':
      logger.error(logMessage);
      break;
  }

  // If no webhook URL configured, just log
  if (!env.ALERT_WEBHOOK_URL) {
    return true;
  }

  try {
    const embed = {
      title: `${ALERT_EMOJIS[level]} ${title}`,
      description,
      color: ALERT_COLORS[level],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Alert Level: ${level.toUpperCase()}`,
      },
    };

    const response = await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      logger.warn(`Failed to send alert webhook: ${response.status}`);
      return false;
    }

    // Record successful alert
    recordAlert(level, title);
    return true;
  } catch (error) {
    logger.warn(
      'Failed to send alert:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Send an info alert
 */
export async function alertInfo(
  title: string,
  description: string
): Promise<boolean> {
  return sendAlert('info', title, description);
}

/**
 * Send a warning alert
 */
export async function alertWarn(
  title: string,
  description: string
): Promise<boolean> {
  return sendAlert('warn', title, description);
}

/**
 * Send an error alert
 */
export async function alertError(
  title: string,
  description: string
): Promise<boolean> {
  return sendAlert('error', title, description);
}

/**
 * Send a critical alert
 */
export async function alertCritical(
  title: string,
  description: string
): Promise<boolean> {
  return sendAlert('critical', title, description);
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimits(): void {
  recentAlerts.clear();
}
