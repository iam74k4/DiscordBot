import {
  ChatInputCommandInteraction,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';
import { getSendableTextChannel } from '../../../shared/utils/discord.js';
import { showNotificationPanel } from './panel.js';

async function validateNotificationChannel(
  interaction: ChatInputCommandInteraction
): Promise<string | null> {
  if (!interaction.guild) {
    return null;
  }

  const channel = interaction.options.getChannel('channel', true);
  if (channel.type !== ChannelType.GuildText) {
    return null;
  }

  const sendableChannel = await getSendableTextChannel(
    interaction.guild,
    channel.id
  );
  if (!sendableChannel) {
    return t(
      'notification.errors.channelNotSendable',
      resolveLocale(interaction)
    );
  }

  return null;
}

export async function handleVoiceSet(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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

  const channelValidationError = await validateNotificationChannel(interaction);
  if (channelValidationError) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(t('common.error', locale), channelValidationError),
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
        description: `${t('notification.voice.set', locale, {
          channel: channel.id,
        })}\n\n${t('notification.voice.nextStep', locale)}`,
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleVoiceRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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
        description: `${t('notification.voice.removed', locale)}\n\n${t(
          'notification.voice.disabledHint',
          locale
        )}`,
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleWelcomeSet(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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

  const channelValidationError = await validateNotificationChannel(interaction);
  if (channelValidationError) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(t('common.error', locale), channelValidationError),
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
        description: `${t('notification.welcome.set', locale, {
          channel: channel.id,
        })}\n\n${t('notification.welcome.nextStep', locale)}`,
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleWelcomeRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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
        description: `${t('notification.welcome.removed', locale)}\n\n${t(
          'notification.welcome.disabledHint',
          locale
        )}`,
        color: COLORS.SUCCESS,
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleStatus(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  await showNotificationPanel(interaction, locale, { initialView: 'status' });
}
