import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/index.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';
import {
  setNotificationChannel,
  getNotificationSettings,
  setNotificationEnabled,
  removeNotificationSettings,
  setUserNotificationPref,
  getUserNotificationPref,
} from '../../services/database/notifications.js';
import { hasSteamRegistered } from '../../services/database/index.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

// ============ Subcommand Handlers ============

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

  setNotificationChannel(interaction.guild.id, channel.id);

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

  const settings = getNotificationSettings(interaction.guild.id);

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

  const settings = getNotificationSettings(interaction.guild.id);

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

  setNotificationEnabled(interaction.guild.id, true);

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

  const settings = getNotificationSettings(interaction.guild.id);

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

  setNotificationEnabled(interaction.guild.id, false);

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

  const removed = removeNotificationSettings(interaction.guild.id);

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

  // Check if user has registered Steam
  if (!hasSteamRegistered(discordId)) {
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
      const enabled = getUserNotificationPref(discordId);
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
      setUserNotificationPref(discordId, true);

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
      setUserNotificationPref(discordId, false);

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

// ============ Command Definition ============

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Game notification settings')
    .setDescriptionLocalizations({
      ja: 'ゲーム通知設定',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // Setup
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set the notification channel')
        .setDescriptionLocalizations({
          ja: '通知チャンネルを設定',
        })
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send notifications to')
            .setDescriptionLocalizations({
              ja: '通知を送信するチャンネル',
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Status
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Check notification settings')
        .setDescriptionLocalizations({
          ja: '通知設定を確認',
        })
    )
    // Enable
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable notifications')
        .setDescriptionLocalizations({
          ja: '通知を有効化',
        })
    )
    // Disable
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable notifications')
        .setDescriptionLocalizations({
          ja: '通知を無効化',
        })
    )
    // Remove
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove notification settings')
        .setDescriptionLocalizations({
          ja: '通知設定を削除',
        })
    )
    // Me (personal settings)
    .addSubcommand((sub) =>
      sub
        .setName('me')
        .setDescription('Toggle your personal notification settings')
        .setDescriptionLocalizations({
          ja: '個人の通知設定を切り替え',
        })
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setDescriptionLocalizations({
              ja: '実行するアクション',
            })
            .addChoices(
              { name: 'Status - Check your settings', value: 'status' },
              { name: 'On - Enable notifications', value: 'on' },
              { name: 'Off - Disable notifications', value: 'off' }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

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
  },
};

export default command;
