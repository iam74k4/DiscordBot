import type { Client } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getErrorMessage, logger } from '../shared/utils/logger.js';
import { setServiceStatus } from '../infrastructure/health/index.js';

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
    const indexJs = join(featuresPath, dir, 'index.js');
    const indexTs = join(featuresPath, dir, 'index.ts');
    const indexPath = existsSync(indexJs)
      ? indexJs
      : existsSync(indexTs)
        ? indexTs
        : null;
    if (!indexPath) {
      logger.debug(`Skipping feature directory without index: ${dir}`);
      continue;
    }
    try {
      const mod = await import(pathToFileURL(indexPath).href);
      if (isFeatureModule(mod)) {
        loaded.push(mod);
        logger.debug(`Discovered feature: ${mod.name}`);
      } else {
        logger.warn(
          `Feature ${dir}/index.ts does not export { name, start, stop }`
        );
      }
    } catch (error) {
      logger.error(`Failed to load feature ${dir}:`, getErrorMessage(error));
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
        getErrorMessage(error)
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
        getErrorMessage(error)
      );
    }
  }
}
