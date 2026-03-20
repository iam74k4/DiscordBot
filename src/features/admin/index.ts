import type { Client } from 'discord.js';
import './helpCatalog.js';
import { auditRepository } from './repositories/index.js';
import { env } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { startDailyCleanup, stopCleanupInterval } from '../../utils/cleanup.js';

export const name = 'admin';
let cleanupInterval: NodeJS.Timeout | null = null;

function cleanupOldAuditLogs(): void {
  const deleted = auditRepository.deleteOldLogs(env.AUDIT_LOG_RETENTION_DAYS);
  if (deleted > 0) {
    logger.info(`Cleaned up ${deleted} old audit log(s)`);
  }
}

/**
 * Start Admin feature
 */
export function start(_client: Client): void {
  if (cleanupInterval) {
    return;
  }
  cleanupInterval = startDailyCleanup(cleanupOldAuditLogs);
}

/**
 * Stop Admin feature
 */
export function stop(): void {
  cleanupInterval = stopCleanupInterval(cleanupInterval);
}
