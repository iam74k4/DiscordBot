# Discord Bot

A modular Discord bot built with TypeScript and discord.js v14.

## Features

- Slash command support with automatic registration
- Steam integration (profile, playtime, game library, ranking)
- Game start notifications
- Playtime history tracking
- Admin system (bot owner commands, server settings)
- Audit logging for admin actions
- Middleware system (permissions, cooldown)
- SQLite database for user data persistence
- Modular architecture for easy extension
- TypeScript with strict type checking
- ESLint + Prettier for code quality

## Requirements

- Node.js 18.0.0 or higher
- Discord Bot Token
- Discord Application Client ID
- Steam Web API Key

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_guild_id  # Optional, for development
BOT_OWNER_IDS=your_discord_user_id  # Comma-separated for multiple owners
STEAM_API_KEY=your_steam_api_key
NODE_ENV=development
```

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

| Command | Description       |
| ------- | ----------------- |
| `/ping` | Check bot latency |

### Steam (`/steam`)

| Subcommand           | Description                                  |
| -------------------- | -------------------------------------------- |
| `profile`            | View Steam profile information               |
| `playtime [game]`    | View playtime statistics                     |
| `games`              | Browse game library with pagination          |
| `recent`             | View recently played games (last 2 weeks)    |
| `ranking`            | Server-wide playtime ranking                 |
| `history`            | Playtime history over time (1 day to 1 year) |
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

### Settings (`/settings`) - Server Admin

| Subcommand        | Description                 |
| ----------------- | --------------------------- |
| `view`            | View current settings       |
| `language <lang>` | Set server language (ja/en) |
| `audit [channel]` | Set audit log channel       |
| `logs`            | View recent audit logs      |

## Available Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start with hot-reload (development)  |
| `npm run build`        | Compile TypeScript to JavaScript     |
| `npm start`            | Run compiled JavaScript (production) |
| `npm run lint`         | Check code with ESLint               |
| `npm run lint:fix`     | Fix ESLint errors automatically      |
| `npm run format`       | Format code with Prettier            |
| `npm run format:check` | Check code formatting                |
| `npm run type-check`   | Check TypeScript types               |

## Project Structure

```
src/
├── index.ts              # Entry point
├── client.ts             # Discord client configuration
├── config/               # Configuration management
│   ├── index.ts
│   └── env.ts
├── commands/             # Slash commands (by category)
│   ├── general/
│   │   └── ping.ts
│   ├── steam/
│   │   ├── steam.ts          # /steam command with subcommands
│   │   └── notify-unified.ts # /notify command with subcommands
│   ├── admin/
│   │   ├── admin.ts          # /admin command (bot owner)
│   │   └── settings.ts       # /settings command (server admin)
│   └── index.ts
├── events/               # Event handlers
│   ├── client/
│   │   └── ready.ts
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
│   ├── notifications/    # Game start notification system
│   │   └── index.ts
│   ├── audit/            # Audit log service
│   │   └── index.ts
│   └── scheduler/        # Scheduled tasks (playtime recording)
│       └── index.ts
├── utils/                # Utilities
│   ├── logger.ts
│   ├── embed.ts
│   └── constants.ts
└── types/                # Type definitions
    ├── index.ts
    ├── command.ts
    ├── event.ts
    └── middleware.ts
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
| `STEAM_API_KEY`     | Steam Web API key               | Yes      |
| `BOT_OWNER_IDS`     | Bot owner Discord IDs (comma-separated) | No |
| `NODE_ENV`          | Set to `production`             | No       |

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
| PR to main/develop | Lint, Type check, Build (GitHub Actions) |
| Push to main | Auto deploy to Railway |

### Branch Strategy

```
feature/* ──→ develop ──→ main
fix/*     ──→ develop ──→ main
chore/*   ──→ develop ──→ main
```

- `main`: Production branch (auto-deploys to Railway)
- `develop`: Development integration branch

## License

MIT
