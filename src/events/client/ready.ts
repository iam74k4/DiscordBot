import { Events } from 'discord.js';
import { Event } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
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

    // Register slash commands with Discord API
    await registerCommands(client);

    logger.info('Bot is ready!');
  },
};

export default event;
