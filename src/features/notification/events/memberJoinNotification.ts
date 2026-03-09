import {
  Events,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Event } from '../../../types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { logger } from '../../../utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';

export const event: Event<typeof Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(client: ExtendedClient, member: GuildMember) {
    if (!client.isFullyReady) return;
    if (member.user.bot) return;

    const guildId = member.guild.id;
    const notifyChannelId = notificationChannelRepository.getEnabled(
      guildId,
      'member_join'
    );
    if (!notifyChannelId) return;

    try {
      const textChannel = await member.guild.channels
        .fetch(notifyChannelId)
        .catch(() => null);
      if (!textChannel || !textChannel.isTextBased()) return;

      const me = member.guild.members.me;
      if (!me) return;

      const perms = (textChannel as TextChannel).permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.SendMessages)) return;

      const locale = mapDiscordLocale(member.guild.preferredLocale);
      const embed = createEmbed({
        title: t('notification.events.memberJoinTitle', locale),
        description: t('notification.events.memberJoin', locale, {
          name: member.displayName,
        }),
        color: COLORS.SUCCESS,
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        fields: [
          {
            name: t('notification.events.memberCount', locale),
            value: `${member.guild.memberCount}`,
            inline: true,
          },
        ],
        timestamp: true,
      });

      await (textChannel as TextChannel).send({ embeds: [embed] });
    } catch (error) {
      logger.warn(
        `Failed to send member join notification: ${error instanceof Error ? error.message : error}`
      );
    }
  },
};

export default event;
