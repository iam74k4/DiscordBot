import { database } from './connection.js';

/**
 * Run a synchronous function inside a database transaction.
 * Automatically commits on success and rolls back on error.
 * Note: Transaction functions do NOT work with async functions (better-sqlite3 limitation).
 */
export function runTransaction<T>(fn: () => T): T {
  const transaction = database.transaction(fn);
  return transaction();
}
