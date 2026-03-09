import Database, { Database as DatabaseType } from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/index.js';

let db: DatabaseType | null = null;

function getDb(): DatabaseType {
  if (!db) {
    const dbPath = join(process.cwd(), env.DATABASE_PATH);
    const dataDir = dirname(dbPath);

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    logger.debug('Database connection opened');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.debug('Database connection closed');
  }
}

export function getTableCount(): number {
  const result = getDb()
    .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
    .get() as { count: number } | undefined;
  return result?.count ?? 0;
}

/**
 * Lazily-initialized database instance.
 * Access via this proxy; the actual connection is created on first use.
 */
export const database: DatabaseType = new Proxy({} as DatabaseType, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
