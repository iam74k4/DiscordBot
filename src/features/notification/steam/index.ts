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
import { mapDiscordLocale, t } from '../../../locales/index.js';
import { interactionHasGuildPermission } from '../../../shared/utils/discord.js';
import {
  steamNotificationRepository,
  steamUserRepository,
} from '../../steam/repositories/index.js';

async function handleSetup(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
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
  steamNotificationRepository.setChannel(interaction.guild.id, channel.id);

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('steam.notify.title', locale),
        description:
          t('steam.notify.setup', locale, { channel: channel.id }) +
          '\n\n' +
          `**${t('steam.notify.howItWorks', locale)}:**\n` +
          t('steam.notify.howItWorksDesc', locale)
            .split('\n')
            .map((line) => `• ${line}`)
            .join('\n') +
          '\n\n' +
          t('steam.notify.setupHint', locale),
        color: COLORS.SUCCESS,
        timestamp: true,
      }),
    ],
  });
}

async function handleStatus(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );
  if (!settings) {
    await interaction.reply({
      embeds: [
        createWarningEmbed(
          t('common.warning', locale),
          t('steam.notify.notSetup', locale)
        ),
      ],
    });
    return;
  }

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('steam.notify.title', locale),
        description:
          `**${t('common.status', locale)}:** ${settings.enabled ? '`ON`' : '`OFF`'}\n` +
          `**${t('steam.notify.channel', locale)}:** <#${settings.channel_id}>\n` +
          `**${t('steam.notify.configured', locale)}:** <t:${Math.floor(settings.created_at / 1000)}:R>`,
        color: settings.enabled ? COLORS.SUCCESS : COLORS.WARNING,
        timestamp: true,
      }),
    ],
  });
}

async function handleEnable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );
  if (!settings) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('steam.notify.setupFirst', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  steamNotificationRepository.setGuildEnabled(interaction.guild.id, true);
  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('steam.notify.title', locale),
        description: `${t('steam.notify.nowEnabled', locale)}\n\n${t(
          'steam.notify.enableHint',
          locale
        )}`,
        color: COLORS.SUCCESS,
        timestamp: true,
      }),
    ],
  });
}

async function handleDisable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
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

  const settings = steamNotificationRepository.getGuildSettings(
    interaction.guild.id
  );
  if (!settings) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.error', locale),
          t('steam.notify.setupFirst', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  steamNotificationRepository.setGuildEnabled(interaction.guild.id, false);
  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('steam.notify.title', locale),
        description: `${t('steam.notify.nowDisabled', locale)}\n\n${t(
          'steam.notify.disableHint',
          locale
        )}`,
        color: COLORS.WARNING,
        timestamp: true,
      }),
    ],
  });
}

async function handleRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  if (!interaction.guild) {
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

  const removed = steamNotificationRepository.removeGuildSettings(
    interaction.guild.id
  );
  if (!removed) {
    await interaction.reply({
      embeds: [
        createWarningEmbed(
          t('common.warning', locale),
          t('steam.notify.noSettings', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      createEmbed({
        title: t('steam.notify.title', locale),
        description: `${t('steam.notify.removed', locale)}\n\n${t(
          'steam.notify.removeHint',
          locale
        )}`,
        color: COLORS.INFO,
        timestamp: true,
      }),
    ],
  });
}

async function handleMe(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const discordId = interaction.user.id;
  const action = interaction.options.getString('action') ?? 'status';

  if (!steamUserRepository.hasRegistered(discordId)) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          t('common.notFound', locale),
          t('steam.errors.notRegistered', locale)
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (action) {
    case 'status': {
      const enabled = steamNotificationRepository.getUserPreference(discordId);
      await interaction.reply({
        embeds: [
          createEmbed({
            title: t('steam.notify.meStatus', locale),
            description:
              `**${t('common.status', locale)}:** ${enabled ? '`ON`' : '`OFF`'}\n\n` +
              (enabled
                ? t('steam.notify.meEnabled', locale)
                : t('steam.notify.meDisabled', locale)) +
              '\n\n' +
              t('steam.notify.meStatusHint', locale),
            color: enabled ? COLORS.SUCCESS : COLORS.WARNING,
            timestamp: true,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    case 'on':
      steamNotificationRepository.setUserPreference(discordId, true);
      await interaction.reply({
        embeds: [
          createEmbed({
            title: t('steam.notify.meStatus', locale),
            description: `${t('steam.notify.meNowEnabled', locale)}\n\n${t(
              'steam.notify.meEnableHint',
              locale
            )}`,
            color: COLORS.SUCCESS,
            timestamp: true,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    case 'off':
      steamNotificationRepository.setUserPreference(discordId, false);
      await interaction.reply({
        embeds: [
          createEmbed({
            title: t('steam.notify.meStatus', locale),
            description: `${t('steam.notify.meNowDisabled', locale)}\n\n${t(
              'steam.notify.meDisableHint',
              locale
            )}`,
            color: COLORS.WARNING,
            timestamp: true,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
  }
}

export async function executeSteamNotificationCommand(
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
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('common.error', locale),
            t('notification.errors.manageGuildRequired', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction);
      return;
    case 'status':
      await handleStatus(interaction);
      return;
    case 'enable':
      await handleEnable(interaction);
      return;
    case 'disable':
      await handleDisable(interaction);
      return;
    case 'remove':
      await handleRemove(interaction);
      return;
    case 'me':
      await handleMe(interaction);
      return;
  }
}
