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
 * Patterns for sensitive data masking
 */
const MASK_PATTERNS: {
  pattern: RegExp;
  name: string;
  replacer?: (match: string) => string;
}[] = [
  // Discord tokens (Bot/Bearer tokens format: base64.base64.base64)
  {
    pattern: /([\w-]{24,}\.[\w-]{6}\.[\w-]{27,})/g,
    name: 'token',
  },
  // Generic API keys (32 character hex strings)
  {
    pattern: /\b([A-F0-9]{32})\b/gi,
    name: 'apikey',
  },
  // Steam ID 64 (17 digits) - partial mask
  {
    pattern: /\b(\d{17})\b/g,
    name: 'steamid',
    replacer: (match: string) => match.slice(0, 4) + '***' + match.slice(-4),
  },
  // Webhook URLs
  {
    pattern: /(https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+)/gi,
    name: 'webhook',
  },
];

/**
 * Mask sensitive data in a string
 */
function maskString(str: string): string {
  let masked = str;
  for (const { pattern, name, replacer } of MASK_PATTERNS) {
    if (replacer) {
      masked = masked.replace(pattern, replacer);
    } else {
      masked = masked.replace(pattern, `[MASKED_${name.toUpperCase()}]`);
    }
  }
  return masked;
}

/**
 * Recursively mask sensitive data in any value
 */
function maskSensitiveData(input: unknown): unknown {
  if (typeof input === 'string') {
    return maskString(input);
  }

  if (Array.isArray(input)) {
    return input.map(maskSensitiveData);
  }

  if (input !== null && typeof input === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Mask values for sensitive key names
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key')
      ) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return input;
}

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

  // Mask sensitive data in message and args
  const maskedMessage = maskString(message);
  const formattedArgs =
    args.length > 0
      ? ' ' +
        args
          .map((arg) => {
            const masked = maskSensitiveData(arg);
            return typeof masked === 'object'
              ? JSON.stringify(masked, null, 2)
              : String(masked);
          })
          .join(' ')
      : '';

  return `${timestamp} ${formattedLevel} ${maskedMessage}${formattedArgs}`;
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Logger utility with automatic sensitive data masking
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
