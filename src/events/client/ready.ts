import { ActivityType, Events } from 'discord.js';
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

    // Set bot presence
    client.user.setPresence({
      activities: [
        {
          name: '/ping',
          type: ActivityType.Listening,
        },
      ],
      status: 'online',
    });

    // Register slash commands
    await registerCommands();

    logger.info('Bot is ready!');
  },
};

export default event;
