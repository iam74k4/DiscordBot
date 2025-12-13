# Discord Bot

A modular Discord bot built with TypeScript and discord.js v14.

## Features

- Slash command support with automatic registration
- Steam integration (profile, playtime, game library, ranking)
- Game start notifications
- Playtime history tracking
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
│   │   └── notify-unified.ts  # /notify command with subcommands
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
│   │   └── notifications.ts
│   ├── steam/            # Steam API client
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── notifications/    # Game start notification system
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

## License

MIT
