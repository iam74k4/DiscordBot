/**
 * Metrics data structure
 */
export interface Metrics {
  commands: {
    executed: number;
    errors: number;
    byName: Map<string, number>;
  };
  api: {
    steamCalls: number;
    steamErrors: number;
  };
  voice: {
    recordings: number;
    totalSeconds: number;
  };
  startTime: number;
}

/**
 * Metrics snapshot for serialization
 */
export interface MetricsSnapshot {
  commands: {
    executed: number;
    errors: number;
    byName: Record<string, number>;
  };
  api: {
    steamCalls: number;
    steamErrors: number;
  };
  voice: {
    recordings: number;
    totalSeconds: number;
  };
  startTime: number;
  uptimeSeconds: number;
}

/**
 * Internal metrics state
 */
const metricsState: Metrics = {
  commands: {
    executed: 0,
    errors: 0,
    byName: new Map(),
  },
  api: {
    steamCalls: 0,
    steamErrors: 0,
  },
  voice: {
    recordings: 0,
    totalSeconds: 0,
  },
  startTime: Date.now(),
};

/**
 * Metrics service for tracking bot usage
 */
export const metrics = {
  /**
   * Increment command execution count
   */
  incrementCommand(name: string): void {
    metricsState.commands.executed++;
    const current = metricsState.commands.byName.get(name) ?? 0;
    metricsState.commands.byName.set(name, current + 1);
  },

  /**
   * Increment command error count
   */
  incrementError(name?: string): void {
    metricsState.commands.errors++;
    if (name) {
      // Track errors by command name with special suffix
      const errorKey = `${name}:error`;
      const current = metricsState.commands.byName.get(errorKey) ?? 0;
      metricsState.commands.byName.set(errorKey, current + 1);
    }
  },

  /**
   * Increment Steam API call count
   */
  incrementSteamCall(): void {
    metricsState.api.steamCalls++;
  },

  /**
   * Increment Steam API error count
   */
  incrementSteamError(): void {
    metricsState.api.steamErrors++;
  },

  /**
   * Record a voice recording
   */
  recordVoiceRecording(durationSeconds: number): void {
    metricsState.voice.recordings++;
    metricsState.voice.totalSeconds += durationSeconds;
  },

  /**
   * Get metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    return {
      commands: {
        executed: metricsState.commands.executed,
        errors: metricsState.commands.errors,
        byName: Object.fromEntries(metricsState.commands.byName),
      },
      api: {
        steamCalls: metricsState.api.steamCalls,
        steamErrors: metricsState.api.steamErrors,
      },
      voice: {
        recordings: metricsState.voice.recordings,
        totalSeconds: metricsState.voice.totalSeconds,
      },
      startTime: metricsState.startTime,
      uptimeSeconds: Math.floor((Date.now() - metricsState.startTime) / 1000),
    };
  },

  /**
   * Reset all metrics
   */
  reset(): void {
    metricsState.commands.executed = 0;
    metricsState.commands.errors = 0;
    metricsState.commands.byName.clear();
    metricsState.api.steamCalls = 0;
    metricsState.api.steamErrors = 0;
    metricsState.voice.recordings = 0;
    metricsState.voice.totalSeconds = 0;
    metricsState.startTime = Date.now();
  },

  /**
   * Format metrics for display
   */
  formatForDisplay(): string {
    const snapshot = this.getSnapshot();
    const topCommands = Object.entries(snapshot.commands.byName)
      .filter(([key]) => !key.endsWith(':error'))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `  ${name}: ${count}`)
      .join('\n');

    const lines = [
      '**Commands**',
      `├ Executed: ${snapshot.commands.executed}`,
      `├ Errors: ${snapshot.commands.errors}`,
      `└ Top Commands:`,
      topCommands || '  (none)',
      '',
      '**Steam API**',
      `├ Calls: ${snapshot.api.steamCalls}`,
      `└ Errors: ${snapshot.api.steamErrors}`,
      '',
      '**Voice**',
      `├ Recordings: ${snapshot.voice.recordings}`,
      `└ Total Duration: ${Math.round(snapshot.voice.totalSeconds / 60)} min`,
    ];

    return lines.join('\n');
  },
};
