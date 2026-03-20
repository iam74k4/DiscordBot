/**
 * Alert webhook utility for critical errors
 */
import { env } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Send an alert to the configured Discord webhook
 */
export async function sendAlert(
  title: string,
  description: string,
  fields?: { name: string; value: string }[]
): Promise<void> {
  const url = env.ALERT_WEBHOOK_URL;
  if (!url) return;

  try {
    const body = {
      embeds: [
        {
          title,
          description,
          color: 0xe74c3c, // red
          fields: fields ?? [],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.warn(`Alert webhook failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    logger.warn(
      `Failed to send alert:`,
      error instanceof Error ? error.message : error
    );
  }
}
