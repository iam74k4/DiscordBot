import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import {
  settingsRepository,
} from '../repositories/index.js';
import { logAuditAction } from '../../../services/audit/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  getSendableTextChannel,
  interactionHasGuildPermission,
} from '../../../utils/discord.js';
import { showSettingsPanel } from './settingsPanel.js';

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
};

async function handleView(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await showSettingsPanel(interaction, locale, 'overview');
}

async function handleAudit(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.guildOnly', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel');

  if (channel) {
    const sendableChannel = await getSendableTextChannel(
      interaction.guild,
      channel.id
    );
    if (!sendableChannel) {
      const embed = createErrorEmbed(
        t('common.error', locale),
        t('notification.errors.channelNotSendable', locale)
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    settingsRepository.setAuditChannel(interaction.guild.id, channel.id);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.configured', locale, {
        channel: channel.id,
      }),
      color: COLORS.SUCCESS,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    void logAuditAction(
      interaction.client,
      interaction.guild.id,
      interaction.user.id,
      'AUDIT_SETUP',
      channel.id,
      `Audit channel set to: #${channel.name}`
    );
  } else {
    settingsRepository.setAuditChannel(interaction.guild.id, null);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: t('settings.audit.disabled', locale),
      color: COLORS.WARNING,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleLogs(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await showSettingsPanel(interaction, locale, 'logs');
}

async function handleLanguage(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.guildOnly', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lang = interaction.options.getString('lang', true);

  settingsRepository.setGuildSettings(interaction.guild.id, { language: lang });

  const languageDisplay = LANGUAGE_DISPLAY_NAMES[lang] ?? lang;

  const embed = createEmbed({
    title: t('settings.language.name', locale),
    description: t('settings.language.changed', locale, {
      language: languageDisplay,
    }),
    color: COLORS.SUCCESS,
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  void logAuditAction(
    interaction.client,
    interaction.guild.id,
    interaction.user.id,
    'SETTINGS_CHANGE',
    undefined,
    `Language changed to: ${lang}`
  );
}

export async function executeSettingsCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (
    !interaction.guild ||
    !interactionHasGuildPermission(interaction, PermissionFlagsBits.ManageGuild)
  ) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.noPermission', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      await handleView(interaction);
      break;
    case 'audit':
      await handleAudit(interaction);
      break;
    case 'logs':
      await handleLogs(interaction);
      break;
    case 'language':
      await handleLanguage(interaction);
      break;
  }
}
