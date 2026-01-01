/**
 * Cleanup old commands and register only current ones
 * Run with: npx tsx src/scripts/cleanup-commands.ts
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { logger } from '../utils/logger.js';

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const rest = new REST().setToken(TOKEN);

async function cleanupCommands() {
  logger.info('Starting command cleanup...\n');

  try {
    // Delete global commands
    logger.info('Fetching global commands...');
    const globalCommands = (await rest.get(
      Routes.applicationCommands(CLIENT_ID)
    )) as Array<{ id: string; name: string }>;

    logger.info(`Found ${globalCommands.length} global commands:`);
    for (const cmd of globalCommands) {
      logger.info(`  - ${cmd.name} (${cmd.id})`);
    }

    if (globalCommands.length > 0) {
      logger.info('\nDeleting all global commands...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      logger.info('Global commands deleted.');
    }

    // Delete guild commands if GUILD_ID is set
    if (GUILD_ID) {
      logger.info(`\nFetching guild commands for ${GUILD_ID}...`);
      const guildCommands = (await rest.get(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      )) as Array<{ id: string; name: string }>;

      logger.info(`Found ${guildCommands.length} guild commands:`);
      for (const cmd of guildCommands) {
        logger.info(`  - ${cmd.name} (${cmd.id})`);
      }

      if (guildCommands.length > 0) {
        logger.info('\nDeleting all guild commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
          body: [],
        });
        logger.info('Guild commands deleted.');
      }
    }

    logger.info('\n✓ Cleanup complete!');
    logger.info('\nRestart the bot to register the current commands.');
  } catch (error) {
    logger.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupCommands();
