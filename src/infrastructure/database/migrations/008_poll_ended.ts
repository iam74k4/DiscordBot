import { database } from '../connection.js';

/**
 * Persist poll finalization across restarts.
 *
 * When Discord edit fails (or the channel is not cached), endPoll keeps the
 * in-memory poll with `ended=true` so votes are not discarded. Without a
 * durable flag, restore re-opens that poll after deploy and late votes mutate
 * a tally that finalization already sealed.
 */
function hasColumn(table: string, column: string): boolean {
  const columns = database.pragma(`table_info(${table})`) as Array<{
    name: string;
  }>;
  return columns.some((c) => c.name === column);
}

export function up(): void {
  if (!hasColumn('polls', 'ended')) {
    database.exec(`
      ALTER TABLE polls
      ADD COLUMN ended INTEGER NOT NULL DEFAULT 0
    `);
  }
}
