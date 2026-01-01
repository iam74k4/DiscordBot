import { Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from '../types/index.js';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Command collection
 */
export const commands = new Collection<string, Command>();

/**
 * Load all commands from the commands directory
 */
export async function loadCommands(): Promise<void> {
  const commandsPath = join(__dirname, '..', 'commands');
  const categoryFolders = readdirSync(commandsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const category of categoryFolders) {
    const categoryPath = join(commandsPath, category);
    const commandFiles = readdirSync(categoryPath).filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.startsWith('index.')
    );

    for (const file of commandFiles) {
      const filePath = join(categoryPath, file);
      const commandModule = await import(
        `file://${filePath.replace(/\\/g, '/')}`
      );
      const command: Command = commandModule.default ?? commandModule.command;

      if (command?.data?.name) {
        commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name} (${category})`);
      } else {
        logger.warn(`Invalid command file: ${filePath}`);
      }
    }
  }

  logger.info(`Loaded ${commands.size} commands`);
}

/**
 * Register slash commands with Discord API
 */
export async function registerCommands(): Promise<void> {
  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const commandData = commands.map((command) => command.data.toJSON());

  try {
    logger.info('Registering slash commands...');

    if (env.DISCORD_GUILD_ID) {
      // Guild-specific registration (instant, for development)
      await rest.put(
        Routes.applicationGuildCommands(
          env.DISCORD_CLIENT_ID,
          env.DISCORD_GUILD_ID
        ),
        { body: commandData }
      );
      logger.info(
        `Registered ${commandData.length} commands to guild ${env.DISCORD_GUILD_ID}`
      );
    } else {
      // Global registration (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
        body: commandData,
      });
      logger.info(`Registered ${commandData.length} global commands`);
    }
  } catch (error) {
    logger.error('Failed to register commands:', error);
    throw error;
  }
}

/**
 * Get a command by name
 */
export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}
