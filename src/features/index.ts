import type { Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { setServiceStatus } from '../services/health/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface FeatureModule {
  name: string;
  start(client: Client): void | Promise<void>;
  stop(): void | Promise<void>;
}

let featureModules: FeatureModule[] = [];

function isFeatureModule(mod: unknown): mod is FeatureModule {
  if (typeof mod !== 'object' || mod === null) return false;
  const m = mod as Record<string, unknown>;
  return (
    typeof m.name === 'string' &&
    typeof m.start === 'function' &&
    typeof m.stop === 'function'
  );
}

/**
 * Discover and load all feature modules from subdirectories.
 * Each feature must export { name, start, stop } from its index.ts.
 */
export async function loadFeatures(): Promise<void> {
  const featuresPath = __dirname;
  const dirs = readdirSync(featuresPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);

  const loaded: FeatureModule[] = [];

  for (const dir of dirs) {
    const indexPath = join(featuresPath, dir, 'index.js');
    try {
      const mod = await import(`file://${indexPath.replace(/\\/g, '/')}`);
      if (isFeatureModule(mod)) {
        loaded.push(mod);
        logger.debug(`Discovered feature: ${mod.name}`);
      } else {
        logger.warn(
          `Feature ${dir}/index.ts does not export { name, start, stop }`
        );
      }
    } catch (error) {
      logger.error(
        `Failed to load feature ${dir}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  featureModules = loaded;
  logger.info(`Loaded ${featureModules.length} features`);
}

export function getFeatureModules(): readonly FeatureModule[] {
  return featureModules;
}

/**
 * Start all features with per-feature error isolation.
 * A failing feature does not prevent other features from starting.
 */
export async function startAllFeatures(client: Client): Promise<void> {
  for (const feature of featureModules) {
    try {
      logger.debug(`Starting feature: ${feature.name}`);
      await feature.start(client);
      setServiceStatus(`feature:${feature.name}`, true);
    } catch (error) {
      logger.error(
        `Failed to start feature ${feature.name}:`,
        error instanceof Error ? error.message : error
      );
      setServiceStatus(`feature:${feature.name}`, false);
    }
  }
}

/**
 * Stop all features in reverse order with per-feature error isolation.
 */
export async function stopAllFeatures(): Promise<void> {
  for (const feature of featureModules.slice().reverse()) {
    try {
      logger.debug(`Stopping feature: ${feature.name}`);
      await feature.stop();
      setServiceStatus(`feature:${feature.name}`, false);
    } catch (error) {
      logger.error(
        `Failed to stop feature ${feature.name}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}
