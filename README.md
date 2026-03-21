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
- Steam integration (profile, playtime, game library, ranking)
- Game start notifications
- Playtime history tracking
- GitHub integration (PR, issue, and repository actions)
- **Voice channel recording** (restricted past-audio recording with `/record`)
- Community features (polls, roulette)
- Admin system (bot owner commands, server settings)
- Audit logging for admin actions
- Middleware system (permissions, cooldown)
- SQLite database for user data persistence
- Modular architecture for easy extension
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
- Steam Web API Key (optional — required for `/steam` commands)

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

Optional (for Steam features):

```env
STEAM_API_KEY=your_steam_api_key
```

Optional (for GitHub features):

```env
GITHUB_TOKEN=your_github_token
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

### 4. Get Steam API Key

1. Go to [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. Register for an API key
3. Add the key to your `.env` file

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

| Command         | Description                |
| --------------- | -------------------------- |
| `/general ping` | Check bot latency          |
| `/general help` | Show command list and help |

### Steam (`/steam`)

| Command                                | Description                               |
| -------------------------------------- | ----------------------------------------- |
| `/steam user profile`                  | View Steam profile information            |
| `/steam user playtime [game]`          | View playtime statistics                  |
| `/steam user games`                    | Browse game library with pagination       |
| `/steam user recent`                   | View recently played games (last 2 weeks) |
| `/steam stats ranking`                 | Server-wide playtime ranking              |
| `/steam stats history`                 | Playtime history over time                |
| `/steam stats chart`                   | View playtime bar chart                   |
| `/steam stats history-graph`           | View playtime history graph               |
| `/steam account register <steamid>`    | Link your Steam account                   |
| `/steam account unregister`            | Unlink your Steam account                 |
| `/steam account whoami`                | Show your linked account                  |
| `/steam notifications setup <channel>` | Set notification channel                  |
| `/steam notifications status`          | Check notification settings               |
| `/steam notifications enable`          | Enable notifications                      |
| `/steam notifications disable`         | Disable notifications                     |
| `/steam notifications remove`          | Remove notification settings              |
| `/steam notifications me [action]`     | Toggle personal notifications             |
| `/steam server stats`                  | View server statistics                    |
| `/steam info help`                     | Show Steam command help                   |

### Admin (`/admin`)

| Command                             | Description                       |
| ----------------------------------- | --------------------------------- |
| `/admin settings view`              | View current settings             |
| `/admin settings language <lang>`   | Set server language (ja/en)       |
| `/admin settings audit [channel]`   | Set audit log channel             |
| `/admin settings logs`              | View recent audit logs            |
| `/admin system stats`               | View bot statistics               |
| `/admin system db`                  | View database statistics          |
| `/admin system guilds`              | List servers the bot is in        |
| `/admin system broadcast <message>` | Send message to all server owners |
| `/admin system health`              | View system health status         |
| `/admin system metrics`             | View bot metrics                  |
| `/admin backup list`                | List database backups             |
| `/admin backup run`                 | Run a manual database backup      |

### GitHub (`/github`)

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `/github pr list`      | List pull requests for a repository   |
| `/github pr view`      | View a pull request                   |
| `/github pr create`    | Open a modal to create a pull request |
| `/github pr merge`     | Merge a pull request                  |
| `/github issue list`   | List issues for a repository          |
| `/github issue view`   | View an issue                         |
| `/github issue create` | Open a modal to create an issue       |
| `/github repo info`    | Show repository information           |

**Notes:**

- Requires `Manage Server` or bot owner access
- `GITHUB_TOKEN` must be configured for the feature to work

### Poll (`/poll`)

| Subcommand                                              | Description                  |
| ------------------------------------------------------- | ---------------------------- |
| `create <question> <options...> [duration] [anonymous]` | Create a poll (2-10 options) |
| `end`                                                   | End your active poll         |

**Options:**

- `question`: Poll question (required)
- `option1` to `option10`: Choices (at least 2 required)
- `duration`: Duration in minutes (optional, unlimited if not set)
- `anonymous`: Anonymous voting (default: false)

### Roulette (`/roulette`)

| Subcommand     | Description                                   |
| -------------- | --------------------------------------------- |
| `member`       | Randomly select one member from voice channel |
| `team <count>` | Divide voice channel members into N teams     |

**Notes:**

- User must be in a voice channel to use these commands
- Bots are automatically excluded from selection

### Voice Recording (`/record`)

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `/record <duration>` | Record past audio from your voice channel |

**Options:**

- `duration`: Recording duration (e.g., `30s`, `1m`, `5m`, max 5 minutes)

**Features:**

- Auto-join: Bot automatically joins voice channels when users enter
- Hybrid buffering: Stores 10 minutes of audio (2 min in memory, 8 min on disk)
- WAV format output at 32kHz/16bit/mono (~18.3MB for 5 minutes)
- Private delivery: Recording responses and files are sent ephemerally
- Automatic file cleanup after `RECORDING_RETENTION_HOURS` (default: 24 hours)
- Memory monitoring with automatic disconnection when threshold exceeded

**Notes:**

- Requires `Manage Server`
- Bot must be in the same voice channel
- Maximum concurrent VC connections: 5 (configurable)

### Data Retention

The bot keeps operational data for limited periods and cleans it up automatically.

- `RECORDING_RETENTION_HOURS`: recording files in `data/recordings/` (default: 24 hours)
- `PLAYTIME_HISTORY_RETENTION_DAYS`: Steam playtime history rows (default: 365 days)
- `VOICE_SESSION_RETENTION_DAYS`: completed VC session rows (default: 30 days)
- `AUDIT_LOG_RETENTION_DAYS`: audit log rows (default: 90 days)
- `BACKUP_RETENTION_DAYS`: database backup files (default: 7 days)

See [`docs/database.md`](docs/database.md) for schema details and retention behavior.

## Available Scripts

| Script                     | Description                          |
| -------------------------- | ------------------------------------ |
| `npm run dev`              | Start with hot-reload (development)  |
| `npm run build`            | Compile TypeScript to JavaScript     |
| `npm start`                | Run compiled JavaScript (production) |
| `npm run lint`             | Check code with ESLint               |
| `npm run lint:fix`         | Fix ESLint errors automatically      |
| `npm run format`           | Format code with Prettier            |
| `npm run format:check`     | Check code formatting                |
| `npm run type-check`       | Check TypeScript types               |
| `npm test`                 | Run unit tests                       |
| `npm run test:watch`       | Run tests in watch mode              |
| `npm run test:coverage`    | Run tests with coverage report       |
| `npm run cleanup-commands` | Remove registered Discord commands   |

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
