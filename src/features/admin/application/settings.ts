import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { guildSettingsRepository } from '../../../infrastructure/guildSettings/index.js';
import { logAuditAction } from '../../../infrastructure/audit/index.js';
import { t } from '../../../locales/index.js';
import { LANGUAGE_AUTO, resolveLocale } from '../../../locales/guildLocale.js';
import {
  getSendableTextChannel,
  interactionHasGuildPermission,
} from '../../../shared/utils/discord.js';
import { showSettingsPanel } from './settingsPanel.js';

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
};

async function handleView(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  await showSettingsPanel(interaction, locale, 'overview');
}

async function handleAudit(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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

    guildSettingsRepository.setAuditChannel(interaction.guild.id, channel.id);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: `${t('settings.audit.configured', locale, {
        channel: channel.id,
      })}\n\n${t('common.nextStep', locale)}: /admin settings logs`,
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
    guildSettingsRepository.setAuditChannel(interaction.guild.id, null);

    const embed = createEmbed({
      title: t('settings.audit.name', locale),
      description: `${t('settings.audit.disabled', locale)}\n\n${t(
        'common.nextStep',
        locale
      )}: /admin settings audit`,
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
  const locale = resolveLocale(interaction);
  await showSettingsPanel(interaction, locale, 'logs');
}

async function handleLanguage(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);

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
  const isAuto = lang === LANGUAGE_AUTO;

  // `auto` is stored as NULL so replies keep following each viewer's locale.
  guildSettingsRepository.setLanguage(
    interaction.guild.id,
    isAuto ? null : lang
  );

  const languageDisplay = isAuto
    ? t('settings.language.auto', locale)
    : (LANGUAGE_DISPLAY_NAMES[lang] ?? lang);

  const embed = createEmbed({
    title: t('settings.language.name', locale),
    description:
      t('settings.language.changed', locale, {
        language: languageDisplay,
      }) + `\n\n${t('common.nextStep', locale)}: /admin settings view`,
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
  const locale = resolveLocale(interaction);

  if (
    !interaction.guild ||
    !interactionHasGuildPermission(interaction, PermissionFlagsBits.ManageGuild)
  ) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('common.permissionsRequired', locale, {
        permissions: t('help.permission.manageGuild', locale),
      })
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
