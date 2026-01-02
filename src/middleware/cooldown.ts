import { ChatInputCommandInteraction } from 'discord.js';
import { Command, MiddlewareResult } from '../types/index.js';
import { DEFAULT_COOLDOWN } from '../utils/constants/index.js';
import { cooldownStore } from '../services/cooldown/index.js';

/**
 * Check and apply cooldown for command execution
 */
export async function cooldownMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<MiddlewareResult> {
  const cooldownAmount = command.options?.cooldown ?? DEFAULT_COOLDOWN;

  // If cooldown is 0 or negative, skip
  if (cooldownAmount <= 0) {
    return { success: true };
  }

  const commandName = command.data.name;
  const userId = interaction.user.id;

  // Check if user is on cooldown
  const remainingMs = cooldownStore.getRemainingCooldown(commandName, userId);
  if (remainingMs > 0) {
    const timeLeft = remainingMs / 1000;
    return {
      success: false,
      message: `Please wait ${timeLeft.toFixed(1)} seconds before using \`/${commandName}\` again.`,
    };
  }

  // Set cooldown
  cooldownStore.setCooldown(commandName, userId, cooldownAmount);

  return { success: true };
}

/**
 * Clear cooldown for a specific user and command
 */
export function clearCooldown(commandName: string, userId: string): void {
  cooldownStore.clearCooldown(commandName, userId);
}

/**
 * Clear all cooldowns for a command
 */
export function clearCommandCooldowns(commandName: string): void {
  cooldownStore.clearCommandCooldowns(commandName);
}
