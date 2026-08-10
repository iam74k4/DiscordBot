import { Events } from 'discord.js';
import { Event } from '../../shared/types/index.js';
import { getErrorMessage, logger } from '../../shared/utils/logger.js';
import { registerCommands } from '../../handlers/commandHandler.js';

/**
 * Ready event - fired when the bot is ready
 */
export const event: Event<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    if (!client.user) return;

    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Set bot presence (no activity status)
    client.user.setPresence({
      activities: [],
      status: 'online',
    });

    client.isFullyReady = true;

    try {
      await registerCommands(client);
    } catch (error) {
      logger.error(
        'Slash command registration failed; continuing with loaded command handlers:',
        getErrorMessage(error)
      );
    }

    logger.info('Bot is ready!');
  },
};
