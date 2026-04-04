import {
  ChatInputCommandInteraction,
  Guild,
  PermissionFlagsBits,
  PermissionResolvable,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';

function extractPermissions(value: unknown): PermissionsBitField | null {
  if (
    value &&
    typeof value === 'object' &&
    'permissions' in value &&
    value.permissions instanceof PermissionsBitField
  ) {
    return value.permissions;
  }

  if (value instanceof PermissionsBitField) {
    return value;
  }

  return null;
}

export function hasPermission(
  value: unknown,
  permission: PermissionResolvable
): boolean {
  const permissions = extractPermissions(value);
  return permissions?.has(permission) ?? false;
}

export function interactionHasGuildPermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable
): boolean {
  if (!interaction.guild || !interaction.member) return false;
  return hasPermission(interaction.member, permission);
}

export async function getSendableTextChannel(
  guild: Guild,
  channelId: string
): Promise<TextChannel | null> {
  const channel =
    guild.channels.cache.get(channelId) ??
    (await guild.channels.fetch(channelId).catch(() => null));

  if (!(channel instanceof TextChannel)) {
    return null;
  }

  const me = guild.members.me;
  if (!me) {
    return null;
  }

  const permissions = channel.permissionsFor(me);
  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    return null;
  }

  return channel;
}
