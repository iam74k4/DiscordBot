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
import { COLORS, TITLES } from '../../utils/constants.js';
import {
  setNotificationChannel,
  getNotificationSettings,
  setNotificationEnabled,
  removeNotificationSettings,
  setUserNotificationPref,
  getUserNotificationPref,
} from '../../services/database/notifications.js';
import { hasSteamRegistered } from '../../services/database/index.js';

// ============ Subcommand Handlers ============

async function handleSetup(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
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
    title: TITLES.NOTIFY,
    description:
      `Game start notifications will be sent to <#${channel.id}>.\n\n` +
      `**How it works:**\n` +
      `• Registered users will be notified when they start a game\n` +
      `• Checks run every 5 minutes\n` +
      `• Users can opt-out with \`/notify me off\``,
    color: COLORS.SUCCESS,
    footer: 'Use /notify status to check settings',
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleStatus(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
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
      TITLES.WARNING,
      'Notifications are not set up for this server.\n\nUse `/notify setup` to configure.'
    );
    await interaction.reply({ embeds: [warningEmbed] });
    return;
  }

  const statusIcon = settings.enabled ? '`ON`' : '`OFF`';
  const statusColor = settings.enabled ? COLORS.SUCCESS : COLORS.WARNING;

  const embed = createEmbed({
    title: TITLES.NOTIFY,
    description:
      `**Status:** ${statusIcon}\n` +
      `**Channel:** <#${settings.channel_id}>\n` +
      `**Configured:** <t:${Math.floor(settings.created_at / 1000)}:R>`,
    color: statusColor,
    footer: 'Use /notify enable or /notify disable to toggle',
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleEnable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
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
      TITLES.ERROR,
      'Please run `/notify setup` first.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setNotificationEnabled(interaction.guild.id, true);

  const embed = createEmbed({
    title: TITLES.NOTIFY,
    description: 'Game notifications are now **enabled** for this server.',
    color: COLORS.SUCCESS,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleDisable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
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
      TITLES.ERROR,
      'Please run `/notify setup` first.'
    );
    await interaction.reply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setNotificationEnabled(interaction.guild.id, false);

  const embed = createEmbed({
    title: TITLES.NOTIFY,
    description: 'Game notifications are now **disabled** for this server.',
    color: COLORS.WARNING,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleRemove(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    const errorEmbed = createErrorEmbed(
      TITLES.ERROR,
      'This command can only be used in a server.'
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
      TITLES.WARNING,
      'There are no notification settings to remove.'
    );
    await interaction.reply({
      embeds: [warningEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = createEmbed({
    title: TITLES.NOTIFY,
    description: 'Notification settings have been removed for this server.',
    color: COLORS.INFO,
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleMe(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const discordId = interaction.user.id;
  const action = interaction.options.getString('action') ?? 'status';

  // Check if user has registered Steam
  if (!hasSteamRegistered(discordId)) {
    const errorEmbed = createErrorEmbed(
      TITLES.NOT_FOUND,
      'You need to link your Steam account first.\n\nUse `/steam register` to get started.'
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
        title: TITLES.NOTIFY_ME,
        description:
          `**Status:** ${statusIcon}\n\n` +
          (enabled
            ? 'You will be mentioned when you start playing a game.'
            : 'You have opted out of game notifications.'),
        color: statusColor,
        footer: 'Use /notify me on or /notify me off to change',
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
        title: TITLES.NOTIFY_ME,
        description: 'You will now receive game start notifications.',
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
        title: TITLES.NOTIFY_ME,
        description: 'You will no longer receive game start notifications.',
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // Setup
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set the notification channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send notifications to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Status
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Check notification settings')
    )
    // Enable
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable notifications')
    )
    // Disable
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable notifications')
    )
    // Remove
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove notification settings')
    )
    // Me (personal settings)
    .addSubcommand((sub) =>
      sub
        .setName('me')
        .setDescription('Toggle your personal notification settings')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Action to perform')
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
