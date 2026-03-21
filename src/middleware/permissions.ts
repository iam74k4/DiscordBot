import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Command, MiddlewareResult } from '../shared/types/index.js';
import { t, mapDiscordLocale } from '../locales/index.js';

/**
 * Check if user has required permissions
 */
export async function permissionsMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<MiddlewareResult> {
  const requiredPermissions = command.options?.permissions;

  if (!requiredPermissions || requiredPermissions.length === 0) {
    return { success: true };
  }

  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild || !interaction.member) {
    return {
      success: false,
      message: t('common.guildOnly', locale),
    };
  }

  const memberPermissions = interaction.member.permissions;

  if (!(memberPermissions instanceof PermissionsBitField)) {
    return {
      success: false,
      message: t('common.permissionsUnverifiable', locale),
    };
  }

  const missingPermissions: string[] = [];

  for (const permission of requiredPermissions) {
    if (!memberPermissions.has(permission)) {
      const permName =
        typeof permission === 'string'
          ? permission
          : new PermissionsBitField(permission).toArray().join(', ');
      missingPermissions.push(permName);
    }
  }

  if (missingPermissions.length > 0) {
    return {
      success: false,
      message: t('common.permissionsRequired', locale, {
        permissions: missingPermissions.join(', '),
      }),
    };
  }

  return { success: true };
}
