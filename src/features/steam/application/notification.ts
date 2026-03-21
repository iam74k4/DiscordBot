import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import {
  steamNotificationRepository,
  steamUserRepository,
} from '../repositories/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { interactionHasGuildPermission } from '../../../shared/utils/discord.js';

async function handleSetup(
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

  const channel = interaction.options.getChannel('channel', true);

  steamNotificationRepository.setChannel(interaction.guild.id, channel.id);

  const embed = createEmbed({
    title: t('steam.notify.title', locale),
    description:
      t('steam.notify.setup', locale, { channel: channel.id }) +
      '\n\n' +
      `**${t('steam.notify.howItWorks', locale)}:**\n` +
      t('steam.notify.howItWorksDesc', locale)
        .split('\n')
        .map((line) => `• ${line}`)
        .join('\n'),
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleStatus(
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );

  if (!settings) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('steam.notify.notSetup', locale)
    );
    await interaction.reply({ embeds: [warningEmbed] });
    return;
  }

  const statusIcon = settings.enabled ? '`ON`' : '`OFF`';
  const statusColor = settings.enabled ? COLORS.SUCCESS : COLORS.WARNING;

  const embed = createEmbed({
    title: t('steam.notify.title', locale),
    description:
      `**${t('common.status', locale)}:** ${statusIcon}\n` +
      `**${t('steam.notify.channel', locale)}:** <#${settings.channel_id}>\n` +
      `**${t('steam.notify.configured', locale)}:** <t:${Math.floor(settings.created_at / 1000)}:R>`,
    color: statusColor,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleEnable(
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );

  if (!settings) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.notify.setupFirst', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  steamNotificationRepository.setGuildEnabled(interaction.guild.id, true);

  const embed = createEmbed({
    title: t('steam.notify.title', locale),
    description: t('steam.notify.nowEnabled', locale),
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleDisable(
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );

  if (!settings) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.notify.setupFirst', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  steamNotificationRepository.setGuildEnabled(interaction.guild.id, false);

  const embed = createEmbed({
    title: t('steam.notify.title', locale),
    description: t('steam.notify.nowDisabled', locale),
    color: COLORS.WARNING,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleRemove(
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

  const removed = steamNotificationRepository.removeGuildSettings(
    interaction.guild.id
  );

  if (!removed) {
    const warningEmbed = createWarningEmbed(
      t('common.warning', locale),
      t('steam.notify.noSettings', locale)
    );
    await interaction.reply({
      embeds: [warningEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = createEmbed({
    title: t('steam.notify.title', locale),
    description: t('steam.notify.removed', locale),
    color: COLORS.INFO,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleMe(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const discordId = interaction.user.id;
  const action = interaction.options.getString('action') ?? 'status';

  if (!steamUserRepository.hasRegistered(discordId)) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      t('steam.errors.notRegistered', locale)
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (action) {
    case 'status': {
      const enabled = steamNotificationRepository.getUserPreference(discordId);
      const statusIcon = enabled ? '`ON`' : '`OFF`';
      const statusColor = enabled ? COLORS.SUCCESS : COLORS.WARNING;

      const embed = createEmbed({
        title: t('steam.notify.meStatus', locale),
        description:
          `**${t('common.status', locale)}:** ${statusIcon}\n\n` +
          (enabled
            ? t('steam.notify.meEnabled', locale)
            : t('steam.notify.meDisabled', locale)),
        color: statusColor,
        timestamp: true,
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'on': {
      steamNotificationRepository.setUserPreference(discordId, true);

      const embed = createEmbed({
        title: t('steam.notify.meStatus', locale),
        description: t('steam.notify.meNowEnabled', locale),
        color: COLORS.SUCCESS,
        timestamp: true,
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case 'off': {
      steamNotificationRepository.setUserPreference(discordId, false);

      const embed = createEmbed({
        title: t('steam.notify.meStatus', locale),
        description: t('steam.notify.meNowDisabled', locale),
        color: COLORS.WARNING,
        timestamp: true,
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
  }
}

export async function executeNotificationCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== 'me') {
    if (
      !interaction.guild ||
      !interactionHasGuildPermission(
        interaction,
        PermissionFlagsBits.ManageGuild
      )
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
  }

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction);
      break;
    case 'status':
      await handleStatus(interaction);
      break;
    case 'enable':
      await handleEnable(interaction);
      break;
    case 'disable':
      await handleDisable(interaction);
      break;
    case 'remove':
      await handleRemove(interaction);
      break;
    case 'me':
      await handleMe(interaction);
      break;
  }
}
