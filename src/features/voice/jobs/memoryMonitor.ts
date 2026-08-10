import { MONITORING, type AppConfig } from '../../../config/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { sendAlert } from '../../../shared/utils/alert.js';
import { connectionManager } from '../recording/connectionManager.js';
import { channelMixRingManager } from '../recording/channelMixRing.js';
import { MemoryMonitorStats } from '../../../shared/types/voice.js';

/** Fractions of MEMORY_LIMIT_MB at which the monitor warns and sheds load. */
const WARNING_RATIO = 0.7;
const CRITICAL_RATIO = 0.85;

/**
 * Memory monitor service.
 *
 * Judges on RSS, not heapUsed: the mix rings are typed arrays whose backing
 * stores live outside the V8 heap, so heapUsed barely moves as they grow -
 * which is precisely the memory this monitor exists to shed.
 */
export class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private checkInProgress = false;
  private readonly limitMB: number;
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;
  private readonly monitorInterval: number;

  constructor(config: Pick<AppConfig, 'MEMORY_LIMIT_MB'>) {
    this.limitMB = config.MEMORY_LIMIT_MB;
    this.warningThreshold = Math.round(this.limitMB * WARNING_RATIO);
    this.criticalThreshold = Math.round(this.limitMB * CRITICAL_RATIO);
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
      void this.checkMemoryUsage();
    }, this.monitorInterval);

    logger.info(
      `Memory monitor started (limit ${this.limitMB}MB, warn at ` +
        `${this.warningThreshold}MB, shed connections at ${this.criticalThreshold}MB RSS)`
    );
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
    // Disconnecting is slower than the tick interval under load; overlapping
    // runs would shed connections twice for the same reading.
    if (this.checkInProgress) return;
    this.checkInProgress = true;
    try {
      await this.runCheck();
    } finally {
      this.checkInProgress = false;
    }
  }

  private async runCheck(): Promise<void> {
    const stats = await this.getStats();

    // Check memory threshold
    if (stats.memoryUsageMB >= this.criticalThreshold) {
      logger.error(
        `Critical memory threshold exceeded: ${stats.memoryUsageMB.toFixed(2)}MB RSS >= ${this.criticalThreshold}MB`
      );
      sendAlert(
        'Critical Memory Threshold Exceeded',
        `${stats.memoryUsageMB.toFixed(1)}MB RSS >= ${this.criticalThreshold}MB`,
        [
          {
            name: 'Active Connections',
            value: String(stats.activeConnections),
          },
          {
            name: 'Mix Buffers (MB)',
            value: stats.totalBufferSizeMB.toFixed(1),
          },
          {
            name: 'Heap Used (MB)',
            value: stats.heapUsedMB.toFixed(1),
          },
        ]
      ).catch(() => undefined);
      // Awaited so the in-progress guard actually covers the disconnects.
      await this.handleCriticalMemory();
    } else if (stats.memoryUsageMB >= this.warningThreshold) {
      logger.warn(
        `Memory warning threshold exceeded: ${stats.memoryUsageMB.toFixed(2)}MB RSS >= ${this.warningThreshold}MB`
      );
    }

    // Log stats periodically
    logger.debug(
      `Memory stats: ${stats.memoryUsageMB.toFixed(2)}MB rss (limit ${stats.limitMB}MB), ` +
        `${stats.heapUsedMB.toFixed(2)}MB heap, ${stats.activeConnections} connections, ` +
        `${stats.totalBufferSizeMB.toFixed(2)}MB mix buffers`
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

    const usage = process.memoryUsage();

    return {
      memoryUsageMB: usage.rss / (1024 * 1024),
      heapUsedMB: usage.heapUsed / (1024 * 1024),
      limitMB: this.limitMB,
      activeConnections: connections.size,
      totalBufferSizeMB,
    };
  }
}
