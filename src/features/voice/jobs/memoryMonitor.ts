import { MONITORING } from '../../../config/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { sendAlert } from '../../../shared/utils/alert.js';
import { connectionManager } from '../recording/connectionManager.js';
import { channelMixRingManager } from '../recording/channelMixRing.js';
import { MemoryMonitorStats } from '../../../shared/types/voice.js';

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
      sendAlert(
        'Critical Memory Threshold Exceeded',
        `${stats.memoryUsageMB.toFixed(1)}MB >= ${this.criticalThreshold}MB`,
        [
          {
            name: 'Active Connections',
            value: String(stats.activeConnections),
          },
          {
            name: 'Buffer Size (MB)',
            value: stats.totalBufferSizeMB.toFixed(1),
          },
        ]
      ).catch(() => undefined);
      this.handleCriticalMemory();
    } else if (stats.memoryUsageMB >= this.warningThreshold) {
      logger.warn(
        `Memory warning threshold exceeded: ${stats.memoryUsageMB.toFixed(2)}MB >= ${this.warningThreshold}MB`
      );
    }

    // Log stats periodically
    logger.debug(
      `Memory stats: ${stats.memoryUsageMB.toFixed(2)}MB memory, ${stats.activeConnections} connections, ${stats.totalBufferSizeMB.toFixed(2)}MB buffers`
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

    const totalBufferSizeMB = channelMixRingManager.getTotalMixBufferSizeMB();

    // Get process memory usage
    const processMemoryMB = process.memoryUsage().heapUsed / (1024 * 1024);

    return {
      memoryUsageMB: processMemoryMB,
      activeConnections: connections.size,
      totalBufferSizeMB,
    };
  }
}

/**
 * Singleton instance
 */
export const memoryMonitor = new MemoryMonitor();
