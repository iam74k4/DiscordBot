import { ChatInputCommandInteraction, Collection } from 'discord.js';
import { Command, MiddlewareResult } from '../types/index.js';
import { DEFAULT_COOLDOWN } from '../utils/constants.js';

/**
 * Cooldown storage: Map<commandName, Map<userId, timestamp>>
 */
const cooldowns = new Collection<string, Collection<string, number>>();

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

  // Initialize cooldown collection for this command if not exists
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection<string, number>());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();

  // Check if user is on cooldown
  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return {
        success: false,
        message: `Please wait ${timeLeft.toFixed(1)} seconds before using \`/${commandName}\` again.`,
      };
    }
  }

  // Set cooldown timestamp
  timestamps.set(userId, now);

  // Auto-remove cooldown after expiration
  setTimeout(() => {
    timestamps.delete(userId);
  }, cooldownAmount);

  return { success: true };
}

/**
 * Clear cooldown for a specific user and command
 */
export function clearCooldown(commandName: string, userId: string): void {
  const timestamps = cooldowns.get(commandName);
  if (timestamps) {
    timestamps.delete(userId);
  }
}

/**
 * Clear all cooldowns for a command
 */
export function clearCommandCooldowns(commandName: string): void {
  cooldowns.delete(commandName);
}
