/**
 * Cleanup old commands and register only current ones
 * Run with: npx tsx src/scripts/cleanup-commands.ts
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const rest = new REST().setToken(TOKEN);

async function cleanupCommands() {
  console.log('Starting command cleanup...\n');

  try {
    // Delete global commands
    console.log('Fetching global commands...');
    const globalCommands = (await rest.get(
      Routes.applicationCommands(CLIENT_ID)
    )) as Array<{ id: string; name: string }>;

    console.log(`Found ${globalCommands.length} global commands:`);
    for (const cmd of globalCommands) {
      console.log(`  - ${cmd.name} (${cmd.id})`);
    }

    if (globalCommands.length > 0) {
      console.log('\nDeleting all global commands...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      console.log('Global commands deleted.');
    }

    // Delete guild commands if GUILD_ID is set
    if (GUILD_ID) {
      console.log(`\nFetching guild commands for ${GUILD_ID}...`);
      const guildCommands = (await rest.get(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      )) as Array<{ id: string; name: string }>;

      console.log(`Found ${guildCommands.length} guild commands:`);
      for (const cmd of guildCommands) {
        console.log(`  - ${cmd.name} (${cmd.id})`);
      }

      if (guildCommands.length > 0) {
        console.log('\nDeleting all guild commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
          body: [],
        });
        console.log('Guild commands deleted.');
      }
    }

    console.log('\n✓ Cleanup complete!');
    console.log('\nRestart the bot to register the current commands.');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupCommands();

