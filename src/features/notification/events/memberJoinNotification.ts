import { Events, GuildMember } from 'discord.js';
import { Event } from '../../../shared/types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveGuildLocale } from '../../../locales/guildLocale.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';
import { getSendableTextChannel } from '../../../shared/utils/discord.js';

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
      const textChannel = await getSendableTextChannel(
        member.guild,
        notifyChannelId
      );
      if (!textChannel) return;

      const locale = resolveGuildLocale(
        guildId,
        mapDiscordLocale(member.guild.preferredLocale)
      );
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

      await textChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(
        `Failed to send member join notification: ${getErrorMessage(error)}`
      );
    }
  },
};
