# Discord Bot

A modular Discord bot built with TypeScript and discord.js v14.

## Features

- Slash command support with automatic registration
- Middleware system (permissions, cooldown)
- Modular architecture for easy extension
- TypeScript with strict type checking
- ESLint + Prettier for code quality

## Requirements

- Node.js 18.0.0 or higher
- Discord Bot Token
- Discord Application Client ID

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_guild_id  # Optional, for development
NODE_ENV=development
```

### 3. Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section and copy the token
4. Go to "OAuth2" > "General" and copy the Client ID
5. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Use Slash Commands`
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

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot-reload (development) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled JavaScript (production) |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix ESLint errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run type-check` | Check TypeScript types |

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
├── services/             # Business logic (future)
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
