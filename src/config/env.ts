import { config as dotenvConfig } from 'dotenv';
import { logger } from '../shared/utils/logger.js';
import { parseConfig, type AppConfig } from './schema.js';

export type { AppConfig } from './schema.js';
export { parseConfig } from './schema.js';

let loaded: AppConfig | null = null;

/**
 * Read `.env`, validate, and cache the result.
 *
 * The composition root calls this once at startup. Importing this module no
 * longer reads the environment or throws, so a module that merely mentions a
 * setting cannot fail a test that never intended to configure one.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  if (loaded) return loaded;

  dotenvConfig();

  const { config, warnings } = parseConfig({ ...process.env, ...source });
  for (const warning of warnings) {
    logger.warn(`Config: ${warning}`);
  }

  loaded = config;
  return loaded;
}

/** Drop the cached config. Tests use this; the running bot never does. */
export function resetConfigForTesting(): void {
  loaded = null;
}

/**
 * The loaded configuration.
 *
 * Access is lazy so that importing a module does not trigger validation;
 * the first read loads it if the composition root has not already.
 */
export const env: AppConfig = new Proxy({} as AppConfig, {
  get(_target, property, receiver) {
    return Reflect.get(loadConfig(), property, receiver);
  },
  has(_target, property) {
    return property in loadConfig();
  },
  ownKeys() {
    return Reflect.ownKeys(loadConfig());
  },
  getOwnPropertyDescriptor(_target, property) {
    return Reflect.getOwnPropertyDescriptor(loadConfig(), property);
  },
});

/**
 * Check if a user is a bot owner
 */
export function isBotOwner(userId: string): boolean {
  return env.BOT_OWNER_IDS.includes(userId);
}
