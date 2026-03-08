import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../utils/constants/index.js';
import { logger } from '../../utils/logger.js';
import { formatAuditTarget } from './format.js';
import { auditRepository, type AuditAction } from './repository.js';

/**
 * Action display names
 */
const ACTION_NAMES: Record<AuditAction, string> = {
  STEAM_REGISTER: 'Steam Account Linked',
  STEAM_UNREGISTER: 'Steam Account Unlinked',
  NOTIFY_SETUP: 'Notification Setup',
  NOTIFY_ENABLE: 'Notifications Enabled',
  NOTIFY_DISABLE: 'Notifications Disabled',
  NOTIFY_REMOVE: 'Notification Settings Removed',
  SETTINGS_CHANGE: 'Settings Changed',
  AUDIT_SETUP: 'Audit Log Configured',
};

/**
 * Action colors
 */
const ACTION_COLORS: Record<AuditAction, number> = {
  STEAM_REGISTER: COLORS.SUCCESS as number,
  STEAM_UNREGISTER: COLORS.WARNING as number,
  NOTIFY_SETUP: COLORS.SUCCESS as number,
  NOTIFY_ENABLE: COLORS.SUCCESS as number,
  NOTIFY_DISABLE: COLORS.WARNING as number,
  NOTIFY_REMOVE: COLORS.ERROR as number,
  SETTINGS_CHANGE: COLORS.INFO as number,
  AUDIT_SETUP: COLORS.INFO as number,
};

async function resolveAuditTargetDisplay(
  client: Client,
  action: AuditAction,
  targetId: string | undefined
): Promise<string | null> {
  const target = formatAuditTarget(action, targetId);
  if (!target) {
    return null;
  }

  if (action === 'AUDIT_SETUP') {
    return target;
  }

  const targetUser = await client.users.fetch(targetId!).catch(() => null);
  return targetUser ? `${targetUser.tag} (${target})` : target;
}

/**
 * Log an audit action and send to audit channel if configured
 */
export async function logAuditAction(
  client: Client,
  guildId: string,
  userId: string,
  action: AuditAction,
  targetId?: string,
  details?: string
): Promise<void> {
  // Save to database
  auditRepository.createLog(guildId, userId, action, targetId, details);

  // Check if audit channel is configured
  const auditChannelId = auditRepository.getAuditChannel(guildId);
  if (!auditChannelId) return;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(auditChannelId) as TextChannel;
    if (!channel) return;

    const user = await client.users.fetch(userId).catch(() => null);
    const targetDisplay = await resolveAuditTargetDisplay(
      client,
      action,
      targetId
    );

    const embed = new EmbedBuilder()
      .setTitle(ACTION_NAMES[action])
      .setColor(ACTION_COLORS[action])
      .addFields({
        name: 'User',
        value: user ? `${user.tag} (<@${userId}>)` : userId,
        inline: true,
      })
      .setTimestamp();

    if (targetDisplay) {
      embed.addFields({
        name: 'Target',
        value: targetDisplay,
        inline: true,
      });
    }

    if (details) {
      embed.addFields({ name: 'Details', value: details, inline: false });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('Failed to send audit log:', error);
  }
}

/**
 * Shorthand for common audit actions
 */
export const audit = {
  steamRegister: (
    client: Client,
    guildId: string,
    userId: string,
    steamName: string
  ) =>
    logAuditAction(
      client,
      guildId,
      userId,
      'STEAM_REGISTER',
      undefined,
      `Steam: ${steamName}`
    ),

  steamUnregister: (client: Client, guildId: string, userId: string) =>
    logAuditAction(client, guildId, userId, 'STEAM_UNREGISTER'),

  notifySetup: (
    client: Client,
    guildId: string,
    userId: string,
    channelId: string
  ) =>
    logAuditAction(
      client,
      guildId,
      userId,
      'NOTIFY_SETUP',
      undefined,
      `Channel: <#${channelId}>`
    ),

  notifyEnable: (client: Client, guildId: string, userId: string) =>
    logAuditAction(client, guildId, userId, 'NOTIFY_ENABLE'),

  notifyDisable: (client: Client, guildId: string, userId: string) =>
    logAuditAction(client, guildId, userId, 'NOTIFY_DISABLE'),

  notifyRemove: (client: Client, guildId: string, userId: string) =>
    logAuditAction(client, guildId, userId, 'NOTIFY_REMOVE'),

  settingsChange: (
    client: Client,
    guildId: string,
    userId: string,
    details: string
  ) =>
    logAuditAction(
      client,
      guildId,
      userId,
      'SETTINGS_CHANGE',
      undefined,
      details
    ),
};
