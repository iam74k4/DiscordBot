import { Events } from 'discord.js';
import { Event } from '../../shared/types/index.js';
import { ExtendedClient } from '../../client.js';
import { routeInteraction } from '../../app/interactions/interactionRouter.js';

/**
 * InteractionCreate event - handles slash command and autocomplete interactions
 */
export const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  async execute(client, interaction) {
    if (!(client as ExtendedClient).isFullyReady) return;
    await routeInteraction(client as ExtendedClient, interaction);
  },
};
