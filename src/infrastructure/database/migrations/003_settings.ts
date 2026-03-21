import { database } from '../connection.js';

export function up(): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      language TEXT DEFAULT 'ja',
      audit_channel_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_id
    ON audit_logs(guild_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at)
  `);
}
