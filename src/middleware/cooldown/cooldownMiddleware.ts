import { ChatInputCommandInteraction } from 'discord.js';
import { Command, MiddlewareResult } from '../../shared/types/index.js';
import { cooldownStore } from './cooldownStore.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

const DEFAULT_COOLDOWN = 3000;

export async function cooldownMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<MiddlewareResult> {
  const cooldownAmount = command.options?.cooldown ?? DEFAULT_COOLDOWN;

  if (cooldownAmount <= 0) {
    return { success: true };
  }

  const commandName = command.data.name;
  const userId = interaction.user.id;

  const remainingMs = cooldownStore.getRemainingCooldown(commandName, userId);
  if (remainingMs > 0) {
    const locale = mapDiscordLocale(interaction.locale);
    const timeLeft = remainingMs / 1000;
    return {
      success: false,
      message: t('common.cooldown', locale, {
        time: timeLeft.toFixed(1),
        command: commandName,
      }),
    };
  }

  cooldownStore.setCooldown(commandName, userId, cooldownAmount);

  return { success: true };
}

export function clearCooldown(commandName: string, userId: string): void {
  cooldownStore.clearCooldown(commandName, userId);
}

export function clearCommandCooldowns(commandName: string): void {
  cooldownStore.clearCommandCooldowns(commandName);
}
