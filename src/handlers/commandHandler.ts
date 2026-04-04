import { REST, Routes } from 'discord.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/index.js';
import { logger } from '../shared/utils/logger.js';
import { ExtendedClient } from '../client.js';
import {
  buildCommandCollection,
  discoverFeatureCommands,
  toDeploymentPayload,
} from '../app/interactions/commandRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all commands from feature modules
 * @param client The Discord client to load commands into
 */
export async function loadCommands(client: ExtendedClient): Promise<void> {
  const featuresPath = join(__dirname, '..', 'features');
  const discovered = await discoverFeatureCommands(featuresPath);
  client.commands = buildCommandCollection(discovered);
  for (const item of discovered) {
    logger.debug(
      `Loaded command: ${item.command.data.name} (features/${item.feature})`
    );
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}

/**
 * Register slash commands with Discord API
 * @param client The Discord client with loaded commands
 */
export async function registerCommands(client: ExtendedClient): Promise<void> {
  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const commandData = toDeploymentPayload(client.commands);

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
