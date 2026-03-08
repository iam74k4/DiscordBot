import { database } from '../connection.js';

export function up(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS steam_users (
      discord_id TEXT PRIMARY KEY,
      steam_id TEXT NOT NULL,
      steam_name TEXT,
      registered_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS playtime_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      steam_id TEXT NOT NULL,
      total_playtime INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_playtime_history_discord_id
    ON playtime_history(discord_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_playtime_history_recorded_at
    ON playtime_history(recorded_at)
  `);
}
