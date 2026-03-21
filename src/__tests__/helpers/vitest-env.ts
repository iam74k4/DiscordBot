/**
 * Required before any test file imports modules that load `src/config` (which
 * calls `validateEnv()` at module load). CI and fresh clones have no `.env`.
 */
if (!process.env.DISCORD_TOKEN) {
  process.env.DISCORD_TOKEN = 'vitest-placeholder-discord-token';
}
if (!process.env.DISCORD_CLIENT_ID) {
  process.env.DISCORD_CLIENT_ID = '1234567890123456789';
}
