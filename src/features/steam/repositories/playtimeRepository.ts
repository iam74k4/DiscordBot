import {
  cleanupOldPlaytimeRecords,
  getClosestRecordBefore,
  getPlaytimeChange,
  getPlaytimeHistory,
  recordPlaytime,
  type PlaytimeHistoryRecord,
} from '../../../services/database/index.js';

export type { PlaytimeHistoryRecord };

export const playtimeRepository = {
  cleanupOldRecords: cleanupOldPlaytimeRecords,
  getClosestRecordBefore,
  getHistory: getPlaytimeHistory,
  getPlaytimeChange,
  record: recordPlaytime,
};
