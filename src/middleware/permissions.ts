import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Command, MiddlewareResult } from '../types/index.js';

/**
 * Check if user has required permissions
 */
export async function permissionsMiddleware(
  interaction: ChatInputCommandInteraction,
  command: Command
): Promise<MiddlewareResult> {
  const requiredPermissions = command.options?.permissions;

  // If no permissions required, pass
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return { success: true };
  }

  // Check if in a guild
  if (!interaction.guild || !interaction.member) {
    return {
      success: false,
      message: 'This command can only be used in a server.',
    };
  }

  // Get member permissions
  const memberPermissions = interaction.member.permissions;

  // Check if permissions is a PermissionsBitField
  if (!(memberPermissions instanceof PermissionsBitField)) {
    return {
      success: false,
      message: 'Unable to verify permissions.',
    };
  }

  // Check each required permission
  const missingPermissions: string[] = [];

  for (const permission of requiredPermissions) {
    if (!memberPermissions.has(permission)) {
      // Convert permission to readable string
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
      message: `You need the following permissions: ${missingPermissions.join(', ')}`,
    };
  }

  return { success: true };
}
