import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import {
  settingsRepository,
  auditRepository,
  type AuditLogRecord,
} from '../repositories/index.js';
import { logAuditAction } from '../../../services/audit/index.js';
import { formatAuditTarget } from '../../../services/audit/format.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { getErrorMessage, logger } from '../../../utils/logger.js';

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
};

async function handleView(
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

  const guildId = interaction.guild.id;

  const buildOverviewEmbed = () => {
    const guildSettings = settingsRepository.getGuildSettings(guildId);
    const language = guildSettings?.language ?? 'ja';
    const languageDisplay = LANGUAGE_DISPLAY_NAMES[language] ?? language;
    const auditChannel = guildSettings?.audit_channel_id
      ? `<#${guildSettings.audit_channel_id}>`
      : t('settings.audit.notSet', locale);

    return createEmbed({
      title: t('settings.title', locale),
      color: COLORS.INFO,
      fields: [
        {
          name: t('settings.language.name', locale),
          value: languageDisplay,
          inline: true,
        },
        {
          name: t('settings.audit.name', locale),
          value: auditChannel,
          inline: true,
        },
      ],
      footer: t('settings.view.footer', locale),
    });
  };

  const buildLanguageEmbed = () => {
    const guildSettings = settingsRepository.getGuildSettings(guildId);
    const language = guildSettings?.language ?? 'ja';
    const languageDisplay = LANGUAGE_DISPLAY_NAMES[language] ?? language;

    return createEmbed({
      title: t('settings.language.name', locale),
      description: `${t('settings.language.current', locale)}: **${languageDisplay}**`,
      color: COLORS.INFO,
      fields: [
        {
          name: t('settings.howToChange', locale),
          value: '`/admin settings language`',
          inline: false,
        },
      ],
    });
  };

  const buildAuditEmbed = () => {
    const guildSettings = settingsRepository.getGuildSettings(guildId);
    const auditChannel = guildSettings?.audit_channel_id
      ? `<#${guildSettings.audit_channel_id}>`
      : t('settings.audit.notSet', locale);

    return createEmbed({
      title: t('settings.audit.name', locale),
      description: auditChannel,
      color: COLORS.INFO,
      fields: [
        {
          name: t('settings.howToChange', locale),
          value: '`/admin settings audit`',
          inline: false,
        },
      ],
    });
  };

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('settings_view')
    .setPlaceholder(t('settings.selectSetting', locale))
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(t('settings.overview', locale))
        .setValue('overview')
        .setDefault(true),
      new StringSelectMenuOptionBuilder()
        .setLabel(t('settings.language.name', locale))
        .setValue('language'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t('settings.audit.name', locale))
        .setValue('audit')
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  const reply = await interaction.reply({
    embeds: [buildOverviewEmbed()],
    components: [row],
    flags: MessageFlags.Ephemeral,
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
  });

  collector.on('collect', async (selectInteraction) => {
    if (selectInteraction.user.id !== interaction.user.id) return;

    const value = selectInteraction.values[0];

    const embedMap: Record<string, () => ReturnType<typeof createEmbed>> = {
      overview: buildOverviewEmbed,
      language: buildLanguageEmbed,
      audit: buildAuditEmbed,
    };

    const embedFn = embedMap[value] ?? buildOverviewEmbed;

    const updatedMenu = StringSelectMenuBuilder.from(
      selectMenu.toJSON()
    ).setOptions(
      selectMenu.options.map((opt) =>
        StringSelectMenuOptionBuilder.from(opt.toJSON()).setDefault(
          opt.toJSON().value === value
        )
      )
    );
    const updatedRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        updatedMenu
      );

    await selectInteraction.update({
      embeds: [embedFn()],
      components: [updatedRow],
    });
  });

  collector.on('end', async () => {
    const disabledMenu = StringSelectMenuBuilder.from(
      selectMenu.toJSON()
    ).setDisabled(true);
    const disabledRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        disabledMenu
      );
    await interaction
      .editReply({ components: [disabledRow] })
      .catch((e: unknown) => {
        logger.debug(
          `Failed to disable settings select menu: ${getErrorMessage(e)}`
        );
      });
  });
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

  const logs = auditRepository.getLogs(interaction.guild.id, 20);
  const totalCount = auditRepository.getLogsCount(interaction.guild.id);

  if (logs.length === 0) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('settings.logs.noLogs', locale)
    );
    await interaction.reply({
      embeds: [warningEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const formatLog = (log: AuditLogRecord): string => {
    const timestamp = Math.floor(log.created_at / 1000);
    const action = log.action.replace('_', ' ');
    const targetDisplay = formatAuditTarget(log.action, log.target_id);
    const target = targetDisplay ? ` → ${targetDisplay}` : '';
    return `<t:${timestamp}:R> <@${log.user_id}> **${action}**${target}`;
  };

  const logList = logs.map(formatLog).join('\n');

  const embed = createEmbed({
    title: t('settings.logs.title', locale),
    description: logList,
    color: COLORS.INFO,
    footer: t('settings.logs.showing', locale, {
      count: logs.length,
      total: totalCount,
    }),
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
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
  const memberPermissions = interaction.member?.permissions;
  const hasManageGuild =
    memberPermissions instanceof PermissionsBitField &&
    memberPermissions.has(PermissionFlagsBits.ManageGuild);

  if (!interaction.guild || !hasManageGuild) {
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
