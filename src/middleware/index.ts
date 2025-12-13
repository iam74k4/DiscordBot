import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
  Command,
  MiddlewareName,
  MiddlewareRegistry,
  MiddlewareResult,
} from '../types/index.js';
import { permissionsMiddleware } from './permissions.js';
import { cooldownMiddleware } from './cooldown.js';
import { createErrorEmbed } from '../utils/embed.js';

/**
 * Middleware registry
 */
const middlewareRegistry: MiddlewareRegistry = {
  permissions: permissionsMiddleware,
  cooldown: cooldownMiddleware,
};

/**
 * Run all middleware for a command
 * @returns true if all middleware passed, false otherwise
 */
export async function runMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<boolean> {
  const middlewareNames = command.middleware ?? [];

  for (const name of middlewareNames) {
    const middleware = middlewareRegistry[name];

    if (!middleware) {
      console.warn(`Unknown middleware: ${name}`);
      continue;
    }

    const result: MiddlewareResult = await middleware(interaction, command);

    if (!result.success) {
      // Send error message to user
      const embed = createErrorEmbed(
        'Command Blocked',
        result.message || 'You cannot use this command.'
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      return false;
    }
  }

  return true;
}

/**
 * Get available middleware names
 */
export function getAvailableMiddleware(): MiddlewareName[] {
  return Object.keys(middlewareRegistry) as MiddlewareName[];
}

// Re-export individual middleware
export { permissionsMiddleware } from './permissions.js';
export {
  cooldownMiddleware,
  clearCooldown,
  clearCommandCooldowns,
} from './cooldown.js';
