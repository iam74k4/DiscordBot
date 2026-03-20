import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../../utils/logger.js';
import { runTransaction } from '../transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let isInitialized = false;

/**
 * Discover migration files by convention (NNN_name.ts/.js), sorted by prefix.
 */
async function loadMigrations(): Promise<Array<() => void>> {
  const migrationDir = __dirname;
  const files = readdirSync(migrationDir)
    .filter(
      (f) =>
        !f.endsWith('.d.ts') && /^\d{3}_.*\.(ts|js)$/.test(f),
    )
    .sort();

  const fns: Array<() => void> = [];
  for (const file of files) {
    const filePath = join(migrationDir, file);
    const mod = await import(`file://${filePath.replace(/\\/g, '/')}`);
    if (typeof mod.up === 'function') {
      fns.push(mod.up);
    } else {
      logger.warn(`Migration ${file} does not export an \`up\` function`);
    }
  }
  return fns;
}

/**
 * Run all database migrations inside a single transaction.
 * Safe to call multiple times — only executes once.
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    logger.warn('Database already initialized, skipping');
    return;
  }

  const migrations = await loadMigrations();

  runTransaction(() => {
    for (const migration of migrations) {
      migration();
    }
  });

  isInitialized = true;
  logger.info(`Database initialized (${migrations.length} migrations)`);
}
