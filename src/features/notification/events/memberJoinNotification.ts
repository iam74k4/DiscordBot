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

      const perms = (textChannel as TextChannel).permissionsFor(
        member.guild.members.me!
      );
      if (!perms?.has(PermissionFlagsBits.SendMessages)) return;

      const embed = createEmbed({
        title: 'Welcome!',
        description: `**${member.displayName}** がサーバーに参加しました！`,
        color: COLORS.SUCCESS,
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        fields: [
          {
            name: 'メンバー数',
            value: `${member.guild.memberCount}人`,
            inline: true,
          },
        ],
        timestamp: true,
      });

      await (textChannel as TextChannel).send({ embeds: [embed] });
    } catch (error) {
      logger.debug(
        `Failed to send member join notification: ${error instanceof Error ? error.message : error}`
      );
    }
  },
};

export default event;
