import Database, { Database as DatabaseType } from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/index.js';

const DB_PATH = join(process.cwd(), env.DATABASE_PATH);
const DATA_DIR = dirname(DB_PATH);

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function closeDatabase(): void {
  db.close();
  logger.debug('Database connection closed');
}

export function getTableCount(): number {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
    .get() as { count: number } | undefined;
  return result?.count ?? 0;
}

export const database: DatabaseType = db;
