import { database } from '../../../infrastructure/database/connection.js';

export interface PlaytimeHistoryRecord {
  id: number;
  discord_id: string;
  steam_id: string;
  total_playtime: number;
  recorded_at: number;
}

function record(
  discordId: string,
  steamId: string,
  totalPlaytime: number
): void {
  const stmt = database.prepare(`
    INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(discordId, steamId, totalPlaytime, Date.now());
}

function getHistory(
  discordId: string,
  startTime: number,
  endTime: number = Date.now()
): PlaytimeHistoryRecord[] {
  const stmt = database.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ? AND recorded_at >= ? AND recorded_at <= ?
    ORDER BY recorded_at ASC
  `);
  return stmt.all(discordId, startTime, endTime) as PlaytimeHistoryRecord[];
}

function getClosestRecordBefore(
  discordId: string,
  time: number
): PlaytimeHistoryRecord | null {
  const stmt = database.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ? AND recorded_at <= ?
    ORDER BY recorded_at DESC
    LIMIT 1
  `);
  return (stmt.get(discordId, time) as PlaytimeHistoryRecord) ?? null;
}

function getLatestRecord(discordId: string): PlaytimeHistoryRecord | null {
  const stmt = database.prepare(`
    SELECT * FROM playtime_history
    WHERE discord_id = ?
    ORDER BY recorded_at DESC
    LIMIT 1
  `);
  return (stmt.get(discordId) as PlaytimeHistoryRecord) ?? null;
}

function getPlaytimeChange(
  discordId: string,
  startTime: number,
  endTime: number = Date.now()
): number {
  const history = getHistory(discordId, startTime, endTime);
  if (history.length < 2) return 0;
  return history[history.length - 1].total_playtime - history[0].total_playtime;
}

function cleanupOldRecords(daysToKeep: number = 365): number {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const stmt = database.prepare(
    'DELETE FROM playtime_history WHERE recorded_at < ?'
  );
  const result = stmt.run(cutoffTime);
  return result.changes;
}

export const playtimeRepository = {
  cleanupOldRecords,
  getClosestRecordBefore,
  getHistory,
  getLatestRecord,
  getPlaytimeChange,
  record,
};
