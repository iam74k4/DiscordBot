/**
 * Seed test data for chart generation testing
 *
 * Usage: npx tsx src/scripts/seed-test-data.ts <discord_id> <steam_id>
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'bot.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS steam_users (
    discord_id TEXT PRIMARY KEY,
    steam_id TEXT NOT NULL,
    steam_name TEXT,
    registered_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS playtime_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    steam_id TEXT NOT NULL,
    total_playtime INTEGER NOT NULL,
    recorded_at INTEGER NOT NULL,
    FOREIGN KEY (discord_id) REFERENCES steam_users(discord_id)
  )
`);

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Generate test playtime history data
 */
function seedPlaytimeHistory(
  discordId: string,
  steamId: string,
  days: number = 90
): void {
  const now = Date.now();
  const startPlaytime = 50000; // Starting at ~833 hours
  const dailyGain = 60; // ~1 hour per day average

  console.log(`Seeding ${days} days of playtime history...`);

  const stmt = db.prepare(`
    INSERT INTO playtime_history (discord_id, steam_id, total_playtime, recorded_at)
    VALUES (?, ?, ?, ?)
  `);

  // Delete existing test data for this user
  db.prepare('DELETE FROM playtime_history WHERE discord_id = ?').run(
    discordId
  );

  for (let i = days; i >= 0; i--) {
    const recordedAt = now - i * ONE_DAY;
    // Add some randomness to make the graph more interesting
    const randomGain = Math.floor(Math.random() * 120); // 0-2 hours random
    const playtime = startPlaytime + (days - i) * dailyGain + randomGain;

    stmt.run(discordId, steamId, playtime, recordedAt);
  }

  console.log(`Inserted ${days + 1} playtime history records`);
}

/**
 * Register or update test user
 */
function ensureTestUser(
  discordId: string,
  steamId: string,
  steamName: string
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO steam_users (discord_id, steam_id, steam_name, registered_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(discordId, steamId, steamName, Date.now());
  console.log(`Registered test user: ${steamName} (${discordId})`);
}

/**
 * Main
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx src/scripts/seed-test-data.ts <discord_id> <steam_id> [steam_name]');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx src/scripts/seed-test-data.ts 123456789012345678 76561198012345678 TestUser');
    process.exit(1);
  }

  const discordId = args[0];
  const steamId = args[1];
  const steamName = args[2] || 'Test User';

  console.log('=== Seeding Test Data ===');
  console.log(`Discord ID: ${discordId}`);
  console.log(`Steam ID: ${steamId}`);
  console.log(`Steam Name: ${steamName}`);
  console.log('');

  // Register user
  ensureTestUser(discordId, steamId, steamName);

  // Seed 90 days of history
  seedPlaytimeHistory(discordId, steamId, 90);

  console.log('');
  console.log('=== Done ===');
  console.log('Test data seeded successfully!');
  console.log('');
  console.log('You can now test:');
  console.log('  /steam history-graph');
  console.log('  /steam chart');

  db.close();
}

main();

