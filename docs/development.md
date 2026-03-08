# Development Guide

## Adding New Commands

1. Create a new feature directory `src/features/<name>/commands/` or add to an existing one:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';

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

2. The command will be automatically loaded from `features/*/commands/` on next restart.

### Command Placement Rules

- Put only public slash command definition files directly under `src/features/<feature>/commands/`.
- Put command-internal logic outside `commands/`, for example in `application/`.
- If a feature needs startup or shutdown logic, expose it from `src/features/<feature>/index.ts`.

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

## Repo Workflow Scripts

| Script        | Description                                   |
| ------------- | --------------------------------------------- |
| `validate.sh` | Run format, lint, type-check, test, and build |
| `pre-push.sh` | Validation for git pre-push hook              |

Install the optional pre-push hook with:

```bash
cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

`pre-push.sh` resolves the repository root with `git rev-parse --show-toplevel` and then runs `scripts/validate.sh`, so the copy-based install works from `.git/hooks/pre-push`.

[← Back to README](../README.md)
