import { existsSync } from 'fs';
import { join } from 'path';
import { env, MONITORING } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import { connectionManager } from './connectionManager.js';
import { audioBufferManager } from './audioBuffer.js';
import { MemoryMonitorStats } from '../../../types/voice.js';

/**
 * Memory monitor service
 */
export class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;
  private readonly monitorInterval: number;

  constructor() {
    this.warningThreshold = MONITORING.MEMORY_WARNING_THRESHOLD_MB;
    this.criticalThreshold = MONITORING.MEMORY_CRITICAL_THRESHOLD_MB;
    this.monitorInterval = MONITORING.MEMORY_MONITOR_INTERVAL_MS;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.interval) {
      logger.warn('Memory monitor is already running');
      return;
    }

    this.interval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.monitorInterval);

    logger.info('Memory monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Memory monitor stopped');
    }
  }

  /**
   * Check memory usage and take action if needed
   */
  private async checkMemoryUsage(): Promise<void> {
    const stats = await this.getStats();

    // Check memory threshold
    if (stats.memoryUsageMB >= this.criticalThreshold) {
      logger.error(
        `Critical memory threshold exceeded: ${stats.memoryUsageMB.toFixed(2)}MB >= ${this.criticalThreshold}MB`
      );
      this.handleCriticalMemory();
    } else if (stats.memoryUsageMB >= this.warningThreshold) {
      logger.warn(
        `Memory warning threshold exceeded: ${stats.memoryUsageMB.toFixed(2)}MB >= ${this.warningThreshold}MB`
      );
    }

    // Check disk usage
    if (stats.diskBufferSizeMB >= MONITORING.DISK_WARNING_THRESHOLD_MB) {
      logger.warn(
        `Disk buffer warning threshold exceeded: ${stats.diskBufferSizeMB.toFixed(2)}MB >= ${MONITORING.DISK_WARNING_THRESHOLD_MB}MB`
      );
    }

    // Log stats periodically
    logger.debug(
      `Memory stats: ${stats.memoryUsageMB.toFixed(2)}MB memory, ${stats.activeConnections} connections, ${stats.totalBufferSizeMB.toFixed(2)}MB buffers, ${stats.diskBufferSizeMB.toFixed(2)}MB disk`
    );
  }

  /**
   * Handle critical memory situation
   */
  private async handleCriticalMemory(): Promise<void> {
    const connections = connectionManager.getAllConnections();
    const connectionCount = connections.size;

    if (connectionCount === 0) return;

    // Disconnect oldest connections (disconnect 1/3 of connections)
    const disconnectCount = Math.max(1, Math.floor(connectionCount / 3));
    logger.warn(
      `Disconnecting ${disconnectCount} oldest connections due to critical memory usage`
    );
    await connectionManager.disconnectOldest(disconnectCount);
  }

  /**
   * Get current memory statistics
   */
  async getStats(): Promise<MemoryMonitorStats> {
    const connections = connectionManager.getAllConnections();
    const bufferStats = await audioBufferManager.getAllStats();

    // Calculate memory usage
    let totalBufferSizeMB = 0;
    let diskBufferSizeMB = 0;

    for (const stats of bufferStats.values()) {
      totalBufferSizeMB += stats.memorySizeMB;
      diskBufferSizeMB += stats.diskSizeMB;
    }

    // Get process memory usage
    const processMemoryMB = process.memoryUsage().heapUsed / (1024 * 1024);

    return {
      memoryUsageMB: processMemoryMB + totalBufferSizeMB,
      activeConnections: connections.size,
      totalBufferSizeMB,
      diskBufferSizeMB,
    };
  }

  /**
   * Get disk usage for buffer directory
   */
  async getDiskUsage(): Promise<number> {
    const bufferDir = join(process.cwd(), env.AUDIO_DISK_BUFFER_DIR);
    if (!existsSync(bufferDir)) return 0;

    let totalSize = 0;
    const bufferStats = await audioBufferManager.getAllStats();

    for (const stats of bufferStats.values()) {
      totalSize += stats.diskSizeMB;
    }

    return totalSize;
  }
}

/**
 * Singleton instance
 */
export const memoryMonitor = new MemoryMonitor();
