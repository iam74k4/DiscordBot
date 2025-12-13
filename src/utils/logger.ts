/**
 * Log levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

/**
 * Get timestamp string
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with color
 */
function formatMessage(
  level: LogLevel,
  message: string,
  ...args: unknown[]
): string {
  const timestamp = `${colors.dim}${getTimestamp()}${colors.reset}`;
  let levelColor: string;
  let levelTag: string;

  switch (level) {
    case 'debug':
      levelColor = colors.cyan;
      levelTag = 'DEBUG';
      break;
    case 'info':
      levelColor = colors.green;
      levelTag = 'INFO';
      break;
    case 'warn':
      levelColor = colors.yellow;
      levelTag = 'WARN';
      break;
    case 'error':
      levelColor = colors.red;
      levelTag = 'ERROR';
      break;
  }

  const formattedLevel = `${levelColor}[${levelTag}]${colors.reset}`;
  const formattedArgs =
    args.length > 0
      ? ' ' +
        args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')
      : '';

  return `${timestamp} ${formattedLevel} ${message}${formattedArgs}`;
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Logger utility
 */
export const logger = {
  /**
   * Log debug message (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (isDebugEnabled()) {
      console.log(formatMessage('debug', message, ...args));
    }
  },

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    console.log(formatMessage('info', message, ...args));
  },

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message, ...args));
  },

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    console.error(formatMessage('error', message, ...args));
  },
};
