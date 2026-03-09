import {
  ChatInputCommandInteraction,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  notificationChannelRepository,
  type NotificationType,
} from '../repositories/notificationChannelRepository.js';

export async function handleVoiceSet(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('notification.errors.textChannelOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  notificationChannelRepository.set(interaction.guildId, 'voice', channel.id);

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.voice.setTitle', locale),
        description: t('notification.voice.set', locale, {
          channel: channel.id,
        }),
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleVoiceRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const removed = notificationChannelRepository.remove(
    interaction.guildId,
    'voice'
  );

  if (!removed) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('notification.errors.notConfigured', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.voice.removedTitle', locale),
        description: t('notification.voice.removed', locale),
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleWelcomeSet(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('notification.errors.textChannelOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  notificationChannelRepository.set(
    interaction.guildId,
    'member_join',
    channel.id
  );

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.welcome.setTitle', locale),
        description: t('notification.welcome.set', locale, {
          channel: channel.id,
        }),
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleWelcomeRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const removed = notificationChannelRepository.remove(
    interaction.guildId,
    'member_join'
  );

  if (!removed) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('notification.errors.notConfigured', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.welcome.removedTitle', locale),
        description: t('notification.welcome.removed', locale),
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleStatus(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('common.guildOnly', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId;
  const records = notificationChannelRepository.getAllForGuild(guildId);

  const typeLabels: Record<NotificationType, string> = {
    voice: t('notification.status.voiceLabel', locale),
    member_join: t('notification.status.welcomeLabel', locale),
  };

  const fields = (['voice', 'member_join'] as NotificationType[]).map(
    (type) => {
      const record = records.find((r) => r.type === type);
      const value = record?.enabled
        ? `<#${record.channel_id}>`
        : t('notification.status.disabled', locale);
      return { name: typeLabels[type], value, inline: true };
    }
  );

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('notification.status.title', locale),
        color: COLORS.INFO,
        fields,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
