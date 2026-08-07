# Discord Bot

![Build Status](https://img.shields.io/github/actions/workflow/status/iam74k4/DiscordBot/.github/workflows/ci.yml?style=flat-square)
![Version](https://img.shields.io/github/v/release/iam74k4/DiscordBot?style=flat-square)
![License](https://img.shields.io/github/license/iam74k4/DiscordBot?style=flat-square)
![Node.js Version](https://img.shields.io/badge/node-22.12%2B-339933?style=flat-square&logo=node.js&logoColor=white)

A modular Discord bot built with TypeScript and discord.js v14.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Commands](#commands)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

## Features

- Slash command support with automatic registration
- **Voice channel recording** (restricted past-audio recording with `/voice record`)
- VC join/leave and member-join notifications, plus per-user VC time stats
- Community features (polls, roulette)
- Admin system (`/admin` server settings, `/owner` bot-owner tools)
- Audit logging for admin actions
- Middleware system (permissions, cooldown)
- SQLite database for persistence
- Modular feature-based architecture for easy extension
- TypeScript with strict type checking
- ESLint + Prettier for code quality

## Tech Stack

| Category     | Technology                    |
| ------------ | ----------------------------- |
| Language     | TypeScript                    |
| Runtime      | Node.js 22+                   |
| Framework    | discord.js v14                |
| Voice        | @discordjs/voice, prism-media |
| Database     | SQLite (better-sqlite3)       |
| Testing      | Vitest                        |
| Code Quality | ESLint, Prettier              |
| Build Tool   | TypeScript Compiler           |
| Development  | tsx (hot-reload)              |
| Charting     | Chart.js, chartjs-node-canvas |
| Scheduling   | node-cron                     |
| Deployment   | Railway                       |
| CI/CD        | GitHub Actions                |

## Requirements

- Node.js 22.12.0 or higher
- Discord Bot Token
- Discord Application Client ID

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Required variables:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
```

For **production** (`NODE_ENV=production`), also set at least one bot owner ID (needed for `/owner` and operational control):

```env
BOT_OWNER_IDS=your_discord_user_id
```

See [.env.example](.env.example) for all configuration options and [docs/deployment.md](docs/deployment.md) for the full environment variable reference.

### 3. Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section and copy the token
4. **Enable Privileged Intents**: Go to "Bot" > Enable `SERVER MEMBERS INTENT`
5. Go to "OAuth2" > "General" and copy the Client ID
6. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
   - Use the generated URL to invite the bot to your server

## Usage

### Development

Run the bot with hot-reload:

```bash
npm run dev
```

### Production

Build and run:

```bash
npm run build
npm start
```

## Commands

### General

| Command          | Description                |
| ---------------- | -------------------------- |
| `/general ping`  | Check bot latency          |
| `/general help`  | Show command list and help |
| `/general about` | Show bot overview          |

### Notification (`/notification`)

| Command                               | Description                            |
| ------------------------------------- | -------------------------------------- |
| `/notification voice set <channel>`   | Set VC join/leave notification channel |
| `/notification voice disable`         | Disable VC join/leave notifications    |
| `/notification welcome set <channel>` | Set member join notification channel   |
| `/notification welcome disable`       | Disable member join notifications      |
| `/notification status`                | Show current notification settings     |
| `/notification stats [period]`        | Show your VC time statistics           |

### Admin (`/admin`)

Requires **Manage Server** in the guild (slash command default permission).

| Command                           | Description                 |
| --------------------------------- | --------------------------- |
| `/admin settings view`            | View current settings       |
| `/admin settings language <lang>` | Set server language (ja/en) |
| `/admin settings audit [channel]` | Set audit log channel       |
| `/admin settings logs`            | View recent audit logs      |
| `/admin role add`                 | Add a role to a member      |
| `/admin role remove`              | Remove a role from a member |

### Bot owner (`/owner`)

Only users listed in `BOT_OWNER_IDS` can run these commands (can be used in DMs with the bot).

| Command                             | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `/owner system stats`               | View bot statistics                          |
| `/owner system db`                  | View database statistics                     |
| `/owner system guilds`              | List servers the bot is in                   |
| `/owner system broadcast <message>` | Send message to server owners (capped batch) |
| `/owner system health`              | View system health status                    |
| `/owner system metrics`             | View bot metrics                             |
| `/owner backup list`                | List database backups                        |
| `/owner backup run`                 | Run a manual database backup                 |

### Community (`/community`)

| Command                                          | Description                             |
| ------------------------------------------------ | --------------------------------------- |
| `/community poll create <question> <options...>` | Create a poll (2-10 options)            |
| `/community poll end`                            | End your active poll                    |
| `/community roulette member`                     | Randomly select one member from VC      |
| `/community roulette team <count>`               | Divide voice channel members into teams |

**Options:**

- `question`: Poll question (required)
- `option1` to `option10`: Choices (at least 2 required)
- `duration`: Duration in minutes (optional, unlimited if not set)
- `anonymous`: Anonymous voting (default: false)

### Voice (`/voice`)

| Command                    | Description                               |
| -------------------------- | ----------------------------------------- |
| `/voice record <duration>` | Record past audio from your voice channel |
| `/voice status`            | Show voice subsystem status               |

**Options:**

- `duration`: Recording duration (e.g., `30s`, `1m`, `5m`, max 5 minutes)

**Features:**

- Auto-join: Bot automatically joins voice channels when users enter
- Hybrid buffering: Stores 10 minutes of audio (2 min in memory, 8 min on disk)
- WAV format output at 48kHz/16bit/mono (~27.5MB for 5 minutes)
- Private delivery: Recording responses and files are sent ephemerally
- Automatic file cleanup after `RECORDING_RETENTION_HOURS` (default: 24 hours)
- Memory monitoring with automatic disconnection when threshold exceeded

**Notes:**

- Requires `Manage Server`
- Bot must be in the same voice channel
- Maximum concurrent VC connections: 5 (configurable)
- Opus decoding uses **`opusscript`** (pure JS) instead of `@discordjs/opus` so installs stay free of vulnerable native prebuild chains; CPU use can be higher than a native Opus build under heavy voice load. See [`docs/quality.md`](docs/quality.md) for dependency overrides.

### Data Retention

The bot keeps operational data for limited periods and cleans it up automatically.

- `RECORDING_RETENTION_HOURS`: recording files in `data/recordings/` (default: 24 hours)
- `VOICE_SESSION_RETENTION_DAYS`: completed VC session rows (default: 30 days)
- `AUDIT_LOG_RETENTION_DAYS`: audit log rows (default: 90 days)
- `BACKUP_RETENTION_DAYS`: database backup files (default: 7 days)

See [`docs/database.md`](docs/database.md) for schema details and retention behavior.

## Available Scripts

| Script                     | Description                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`              | Start with hot-reload (development)                                                 |
| `npm run build`            | Compile TypeScript to JavaScript                                                    |
| `npm start`                | Run compiled JavaScript (production)                                                |
| `npm run lint`             | Check code with ESLint                                                              |
| `npm run lint:fix`         | Fix ESLint errors automatically                                                     |
| `npm run format`           | Format code with Prettier                                                           |
| `npm run format:check`     | Check code formatting                                                               |
| `npm run type-check`       | Check TypeScript types                                                              |
| `npm test`                 | Run unit tests                                                                      |
| `npm run test:watch`       | Run tests in watch mode                                                             |
| `npm run test:coverage`    | Run tests with coverage report                                                      |
| `npm run audit:all`        | Run full + production-scoped `npm audit` (see [`docs/quality.md`](docs/quality.md)) |
| `npm run cleanup-commands` | Remove registered Discord commands                                                  |

## Project Structure

Feature-based architecture: each feature lives under `src/features/` and exports a lifecycle module from `index.ts`.

- `src/features/index.ts` is the single registry for feature startup and shutdown.
- `src/features/<feature>/commands/` contains only public slash command definitions.
- `src/features/<feature>/application/` is the internal command/application layer.
- `src/features/<feature>/repositories/` contains feature-specific persistence access.
- Feature runtime code should prefer explicit folders such as `integrations/`, `jobs/`, `recording/`, and `tracking/`; `services/` remains only where a smaller stateful boundary is clearer, such as `poll/services/`.
- `src/infrastructure/` contains shared runtime infrastructure such as database bootstrap, backup, health, and metrics.
- `src/shared/` contains cross-feature utilities, shared types, and the shared help catalog.
- `src/app-scripts/` contains TypeScript maintenance scripts, while root `scripts/` contains repo workflow shell scripts.

See [`docs/architecture.md`](docs/architecture.md) for the full structure and lifecycle rules.

## Documentation

- [`docs/architecture.md`](docs/architecture.md): project structure and lifecycle
- [`docs/development.md`](docs/development.md): command development, middleware, and local workflow scripts
- [`docs/database.md`](docs/database.md): SQLite tables and persistence notes
- [`docs/deployment.md`](docs/deployment.md): Railway deployment and CI/CD flow
- [`docs/quality.md`](docs/quality.md): quality standards and best practices

## License

MIT
