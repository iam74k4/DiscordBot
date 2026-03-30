# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TypeScript Discord bot (discord.js v14) with embedded SQLite (better-sqlite3). No external services (no Docker, no Postgres, no Redis). All features auto-discovered from `src/features/`.

### Running quality checks

Full CI parity in one command:

```bash
bash scripts/validate.sh
```

This runs: `format:check` → `lint` → `type-check` → `test` → `npm audit` → `build` (see `scripts/validate.sh`).

Individual commands are documented in `package.json` scripts and `README.md#available-scripts`.

### Running the bot (`npm run dev`)

Requires `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` environment variables. Without valid credentials the bot initializes fully (database, features, commands, events) but fails at the Discord WebSocket login step with `TokenInvalid`. This is expected.

Set these as Cursor Cloud secrets (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`) or in a `.env` file (copy from `.env.example`).

### System dependencies for canvas

`chartjs-node-canvas` (used for chart image rendering) requires system-level Cairo/Pango dev libraries. These are pre-installed in the current environment: `libcairo2-dev`, `libjpeg-dev`, `libpango1.0-dev`, `libgif-dev`, `librsvg2-dev`. If `npm install` fails on `canvas`-related native addons, ensure these are installed via `apt-get`.

### Testing

Tests use Vitest with fully mocked Discord objects — no real Discord token or network access needed. See `README.md#testing` and `docs/development.md#testing` for patterns and conventions.
