# Discord Bot

![Build Status](https://img.shields.io/github/actions/workflow/status/iam74k4/DiscordBot/.github/workflows/ci.yml?style=flat-square)
![Version](https://img.shields.io/github/v/release/iam74k4/DiscordBot?style=flat-square)
![License](https://img.shields.io/github/license/iam74k4/DiscordBot?style=flat-square)
![Node.js Version](https://img.shields.io/node/v/discord.js?style=flat-square)

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
- [Database](#database)
- [Adding New Commands](#adding-new-commands)
- [Adding New Middleware](#adding-new-middleware)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [License](#license)

## Features

- Slash command support with automatic registration
- Steam integration (profile, playtime, game library, ranking)
- Game start notifications
- Playtime history tracking
- **Voice channel recording** (record past audio with `/record` command)
- Community features (polls, roulette)
- Admin system (bot owner commands, server settings)
- Audit logging for admin actions
- Middleware system (permissions, cooldown)
- SQLite database for user data persistence
- Modular architecture for easy extension
- TypeScript with strict type checking
- ESLint + Prettier for code quality

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Runtime | Node.js 18+ |
| Framework | discord.js v14 |
| Voice | @discordjs/voice, prism-media |
| Database | SQLite (better-sqlite3) |
| Testing | Vitest |
| Code Quality | ESLint, Prettier |
| Build Tool | TypeScript Compiler |
| Development | tsx (hot-reload) |
| Charting | Chart.js, chartjs-node-canvas |
| Scheduling | node-cron |
| Deployment | Railway |
| CI/CD | GitHub Actions |

## Requirements

- Node.js 18.0.0 or higher
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

See `.env.example` for all available configuration options including voice recording settings.

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

| Command | Description                |
| ------- | -------------------------- |
| `/ping` | Check bot latency          |
| `/help` | Show command list and help |

### Server (`/server`)

| Subcommand | Description            |
| ---------- | ---------------------- |
| `stats`    | View server statistics |

### Steam (`/steam`)

| Subcommand           | Description                                  |
| -------------------- | -------------------------------------------- |
| `profile`            | View Steam profile information               |
| `playtime [game]`    | View playtime statistics                     |
| `games`              | Browse game library with pagination          |
| `recent`             | View recently played games (last 2 weeks)    |
| `ranking`            | Server-wide playtime ranking                 |
| `history`            | Playtime history over time (1 day to 1 year) |
| `chart`              | View playtime bar chart                      |
| `history-graph`      | View playtime history graph                  |
| `register <steamid>` | Link your Steam account                      |
| `unregister`         | Unlink your Steam account                    |
| `whoami`             | Show your linked account                     |
| `help`               | Show command help                            |

### Notifications (`/notify`)

| Subcommand        | Description                      |
| ----------------- | -------------------------------- |
| `setup <channel>` | Set notification channel (Admin) |
| `status`          | Check notification settings      |
| `enable`          | Enable notifications             |
| `disable`         | Disable notifications            |
| `remove`          | Remove notification settings     |
| `me [action]`     | Toggle personal notifications    |

### Admin (`/admin`) - Bot Owner Only

| Subcommand            | Description                       |
| --------------------- | --------------------------------- |
| `stats`               | View bot statistics               |
| `db`                  | View database statistics          |
| `guilds`              | List servers the bot is in        |
| `broadcast <message>` | Send message to all server owners |
| `health`              | View system health status         |
| `backup-list`         | List database backups             |
| `backup-run`          | Run a manual database backup      |
| `metrics`             | View bot metrics                  |

### Settings (`/settings`) - Server Admin

| Subcommand        | Description                 |
| ----------------- | --------------------------- |
| `view`            | View current settings       |
| `language <lang>` | Set server language (ja/en) |
| `audit [channel]` | Set audit log channel       |
| `logs`            | View recent audit logs      |

### Poll (`/poll`)

| Subcommand                                      | Description                              |
| ----------------------------------------------- | ---------------------------------------- |
| `create <question> <options...> [duration] [anonymous]` | Create a poll (2-10 options)   |
| `end`                                           | End your active poll                     |

**Options:**
- `question`: Poll question (required)
- `option1` to `option10`: Choices (at least 2 required)
- `duration`: Duration in minutes (optional, unlimited if not set)
- `anonymous`: Anonymous voting (default: false)

### Roulette (`/roulette`)

| Subcommand      | Description                                    |
| --------------- | ---------------------------------------------- |
| `member`        | Randomly select one member from voice channel  |
| `team <count>`  | Divide voice channel members into N teams      |

**Notes:**
- User must be in a voice channel to use these commands
- Bots are automatically excluded from selection

### Voice Recording (`/record`)

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `/record <duration>` | Record past audio from voice channel |

**Options:**
- `duration`: Recording duration (e.g., `30s`, `1m`, `5m`, max 5 minutes)

**Features:**
- Auto-join: Bot automatically joins voice channels when users enter
- Hybrid buffering: Stores 10 minutes of audio (2 min in memory, 8 min on disk)
- WAV format output at 32kHz/16bit/mono (~18.3MB for 5 minutes)
- Automatic file cleanup after 24 hours
- Memory monitoring with automatic disconnection when threshold exceeded

**Notes:**
- Bot must be in the same voice channel
- Maximum concurrent VC connections: 5 (configurable)

## Available Scripts

| Script                   | Description                            |
| ------------------------ | -------------------------------------- |
| `npm run dev`            | Start with hot-reload (development)    |
| `npm run build`          | Compile TypeScript to JavaScript       |
| `npm start`              | Run compiled JavaScript (production)   |
| `npm run lint`           | Check code with ESLint                 |
| `npm run lint:fix`       | Fix ESLint errors automatically        |
| `npm run format`         | Format code with Prettier              |
| `npm run format:check`   | Check code formatting                  |
| `npm run type-check`     | Check TypeScript types                 |
| `npm test`               | Run unit tests                         |
| `npm run test:watch`     | Run tests in watch mode                |
| `npm run test:coverage`  | Run tests with coverage report         |

## Project Structure

```
src/
├── index.ts              # Entry point with graceful shutdown
├── client.ts             # Discord client configuration
├── config/               # Configuration management
│   ├── index.ts
│   ├── env.ts            # Environment variables (with validation)
│   └── constants.ts      # Internal constants (audio, limits, monitoring)
├── commands/             # Slash commands (by category)
│   ├── general/
│   │   ├── ping.ts
│   │   ├── help.ts
│   │   └── server.ts
│   ├── steam/
│   │   ├── steam.ts          # /steam command definition & routing
│   │   ├── notification.ts   # /notify command with subcommands
│   │   ├── shared.ts         # Shared utilities for steam commands
│   │   └── handlers/         # Subcommand handlers (split by feature)
│   │       ├── profile.ts
│   │       ├── playtime.ts
│   │       ├── games.ts
│   │       ├── recent.ts
│   │       ├── ranking.ts
│   │       ├── history.ts
│   │       ├── chart.ts
│   │       ├── account.ts
│   │       └── autocomplete.ts
│   ├── admin/
│   │   ├── admin.ts          # /admin command (bot owner)
│   │   └── settings.ts       # /settings command (server admin)
│   ├── community/
│   │   ├── poll.ts           # /poll command (voting)
│   │   └── roulette.ts       # /roulette command (random selection)
│   ├── voice/
│   │   └── record.ts         # /record command (VC recording)
│   └── index.ts
├── events/               # Event handlers
│   ├── client/
│   │   └── ready.ts
│   ├── guild/
│   │   └── voiceStateUpdate.ts  # VC auto-join event
│   ├── interaction/
│   │   └── interactionCreate.ts
│   └── index.ts
├── handlers/             # Loaders
│   ├── commandHandler.ts
│   └── eventHandler.ts
├── middleware/           # Middleware (pre-processing)
│   ├── index.ts
│   ├── permissions.ts
│   └── cooldown.ts
├── services/             # Business logic
│   ├── database/         # SQLite database operations
│   │   ├── index.ts
│   │   ├── notifications.ts
│   │   └── settings.ts   # Guild settings & audit logs
│   ├── steam/            # Steam API client
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── voice/            # Voice recording service
│   │   ├── connectionManager.ts  # VC connection management
│   │   ├── audioBuffer.ts        # Hybrid audio buffering
│   │   ├── recordingService.ts   # Recording & WAV conversion
│   │   ├── memoryMonitor.ts      # Memory usage monitoring
│   │   ├── fileCleanup.ts        # Auto file cleanup
│   │   └── index.ts
│   ├── notifications/    # Game start notification system
│   │   └── index.ts
│   ├── poll/             # Poll management service
│   │   ├── pollStore.ts
│   │   ├── pollService.ts
│   │   └── index.ts
│   ├── cooldown/         # Cooldown management service
│   │   ├── cooldownStore.ts
│   │   └── index.ts
│   ├── audit/            # Audit log service
│   │   └── index.ts
│   ├── alert/            # Alert webhook service
│   │   └── index.ts
│   ├── backup/           # Database backup service
│   │   └── index.ts
│   ├── health/           # System health check service
│   │   └── index.ts
│   ├── metrics/          # Bot metrics service
│   │   └── index.ts
│   └── scheduler/        # Scheduled tasks (playtime recording)
│       └── index.ts
├── scripts/              # Utility scripts
│   └── cleanup-commands.ts
├── __tests__/            # Test files
│   ├── utils/
│   ├── services/
│   └── integration/
├── utils/                # Utilities
│   ├── logger.ts
│   ├── embed.ts
│   ├── retry.ts          # Retry logic with exponential backoff
│   ├── lruCache.ts       # LRU cache implementation
│   ├── fuzzy.ts          # Fuzzy search for autocomplete
│   ├── chart.ts          # Chart generation
│   └── constants/        # Constants (domain-separated)
│       ├── colors.ts
│       ├── steam.ts
│       ├── ui.ts
│       ├── bot.ts
│       └── index.ts
├── locales/              # Internationalization (i18n)
│   ├── en.ts
│   ├── ja.ts
│   ├── types.ts
│   └── index.ts
└── types/                # Type definitions
    ├── index.ts
    ├── command.ts
    ├── event.ts
    ├── middleware.ts
    └── voice.ts          # Voice recording types
```

## Database

The bot uses SQLite (via `better-sqlite3`) for data persistence. The database file is stored at `data/bot.db`.

### Tables

- `steam_users` - Discord-Steam account links
- `playtime_history` - Historical playtime records
- `notification_settings` - Server notification settings
- `user_notification_prefs` - User notification preferences
- `game_activity_cache` - Game activity tracking
- `guild_settings` - Server settings (language, audit channel)
- `audit_logs` - Audit log entries

## Adding New Commands

1. Create a new file in `src/commands/<category>/`:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('My command description'),

  middleware: ['cooldown'], // Optional

  options: {
    cooldown: 5000, // Optional: 5 seconds
  },

  async execute(interaction) {
    await interaction.reply('Hello!');
  },
};

export default command;
```

2. The command will be automatically loaded on next restart.

## Adding New Middleware

1. Create a new file in `src/middleware/`:

```typescript
import { ChatInputCommandInteraction } from 'discord.js';
import { Command, MiddlewareResult } from '../types/index.js';

export async function myMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<MiddlewareResult> {
  // Your logic here
  return { success: true };
}
```

2. Register in `src/middleware/index.ts`
3. Add to `MiddlewareName` type in `src/types/middleware.ts`

## Deployment

### Railway (Recommended)

This bot can be deployed to [Railway](https://railway.app/) with automatic deployments from the `main` branch.

#### 1. Create Railway Project

1. Go to [Railway](https://railway.app/) and sign up/login
2. Click "New Project" > "Deploy from GitHub repo"
3. Select this repository
4. Railway will automatically detect the Node.js project

#### 2. Configure Volume (Required for SQLite)

The bot uses SQLite for data persistence. To prevent data loss on redeployments:

1. In your Railway project, go to the service
2. Click "Settings" > "Volumes"
3. Add a new volume:
   - Mount Path: `/app/data`
   - Size: 1GB (sufficient for most use cases)

#### 3. Set Environment Variables

In Railway dashboard, add the following variables:

| Variable            | Description                     | Required |
| ------------------- | ------------------------------- | -------- |
| `DISCORD_TOKEN`     | Discord bot token               | Yes      |
| `DISCORD_CLIENT_ID` | Discord application client ID   | Yes      |
| `STEAM_API_KEY`     | Steam Web API key               | No (Steam commands need this) |
| `BOT_OWNER_IDS`     | Bot owner Discord IDs (comma-separated) | No |
| `NODE_ENV`          | Set to `production`             | No       |
| `MAX_RECORDING_DURATION` | Max recording time in seconds (default: 300) | No |
| `AUDIO_BUFFER_DURATION` | Audio buffer time in seconds (default: 600) | No |
| `AUDIO_MEMORY_BUFFER_DURATION` | Memory buffer time in seconds (default: 120) | No |
| `MAX_CONCURRENT_VC_CONNECTIONS` | Max concurrent VC connections (default: 5) | No |
| `BACKUP_RETENTION_DAYS` | Days to keep backups (default: 7) | No |
| `BACKUP_CRON` | Backup schedule cron expression (default: `0 4 * * *`) | No |
| `ALERT_WEBHOOK_URL` | Discord webhook URL for alerts | No |

#### 4. Deploy

Railway will automatically deploy when you push to the `main` branch.

#### Estimated Cost

| Item           | Monthly Cost |
| -------------- | ------------ |
| Hobby Plan     | $5           |
| Volume (1GB)   | ~$0.25       |
| **Total**      | **~$5.25**   |

## CI/CD

This project uses GitHub Actions for CI and Railway for deployment.

### Workflows

| Trigger | Actions |
| ------- | ------- |
| PR to main/develop | Lint, Type check, Test, Build (GitHub Actions) |
| Push to main/develop | Lint, Type check, Test, Build (GitHub Actions) |
| Push tag (v*) | Build, Create GitHub Release |

### Deployment

Railway automatically deploys from the `main` branch when changes are pushed. Railway is configured to watch the GitHub repository and deploy automatically.

For manual releases, create a tag (e.g., `v1.0.0`) to trigger the release workflow which creates a GitHub Release with build artifacts.

### Branch Strategy

```
feature/* ──→ develop ──→ main
fix/*     ──→ develop ──→ main
chore/*   ──→ develop ──→ main
```

- `main`: Production branch (auto-deploys to Railway via Railway's GitHub integration)
- `develop`: Development integration branch

## License

MIT
