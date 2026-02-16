import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from '../types/index.js';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ExtendedClient } from '../client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Reference to the client's commands collection
let clientCommands: ExtendedClient['commands'] | null = null;

/**
 * Load all commands from the commands directory
 * @param client The Discord client to load commands into
 */
export async function loadCommands(client: ExtendedClient): Promise<void> {
  clientCommands = client.commands;

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
      try {
        const commandModule = await import(
          `file://${filePath.replace(/\\/g, '/')}`
        );
        const command: Command = commandModule.default ?? commandModule.command;

        if (command?.data?.name && typeof command.execute === 'function') {
          client.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name} (${category})`);
        } else {
          logger.warn(
            `Invalid command file: ${filePath} - missing data.name or execute`
          );
        }
      } catch (error) {
        logger.error(
          `Failed to load command from ${filePath}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}

/**
 * Register slash commands with Discord API
 * @param client The Discord client with loaded commands
 */
export async function registerCommands(client: ExtendedClient): Promise<void> {
  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const commandData = client.commands.map((command) => command.data.toJSON());

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
 * Get a command by name from the client
 * @deprecated Use client.commands.get(name) directly
 */
export function getCommand(name: string): Command | undefined {
  if (!clientCommands) {
    logger.warn('getCommand called before loadCommands - commands not loaded');
    return undefined;
  }
  return clientCommands.get(name);
}
