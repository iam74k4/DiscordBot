import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import {
  handleVoiceSet,
  handleVoiceRemove,
  handleWelcomeSet,
  handleWelcomeRemove,
  handleStatus,
  handleStats,
} from '../application/index.js';
import { interactionHasGuildPermission } from '../../../shared/utils/discord.js';
import { executeSteamNotificationCommand } from '../steam/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('notification')
    .setDescription('Notification settings, Steam alerts, and VC time stats')
    .setDescriptionLocalizations({ ja: '通知設定・Steam通知・VC統計' })
    .setDMPermission(false)
    .addSubcommandGroup((group) =>
      group
        .setName('voice')
        .setDescription('VC join/leave notifications, not recordings')
        .setDescriptionLocalizations({
          ja: 'VC入退室の通知設定（録音ではありません）',
        })
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Set the notification channel for VC events')
            .setDescriptionLocalizations({
              ja: 'VC入退室通知チャンネルを設定',
            })
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Text channel for notifications')
                .setDescriptionLocalizations({ ja: '通知先テキストチャンネル' })
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('disable')
            .setDescription('Disable VC notifications')
            .setDescriptionLocalizations({ ja: 'VC入退室通知を無効化' })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('welcome')
        .setDescription('New member join announcements')
        .setDescriptionLocalizations({ ja: 'メンバー参加通知' })
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Set the notification channel for new members')
            .setDescriptionLocalizations({
              ja: 'メンバー参加通知チャンネルを設定',
            })
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Text channel for notifications')
                .setDescriptionLocalizations({ ja: '通知先テキストチャンネル' })
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('disable')
            .setDescription('Disable member join notifications')
            .setDescriptionLocalizations({ ja: 'メンバー参加通知を無効化' })
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Show the current notification settings panel')
        .setDescriptionLocalizations({ ja: '現在の通知設定パネルを表示' })
    )
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription('Show your own VC time statistics')
        .setDescriptionLocalizations({ ja: '自分のVC滞在時間統計を表示' })
        .addStringOption((opt) =>
          opt
            .setName('period')
            .setDescription('Time period')
            .setDescriptionLocalizations({ ja: '期間' })
            .addChoices(
              {
                name: 'Today',
                name_localizations: { ja: '今日' },
                value: 'today',
              },
              {
                name: 'This week',
                name_localizations: { ja: '今週' },
                value: 'week',
              },
              {
                name: 'This month',
                name_localizations: { ja: '今月' },
                value: 'month',
              },
              {
                name: 'All time',
                name_localizations: { ja: '全期間' },
                value: 'all',
              }
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('steam')
        .setDescription('Steam game start notification settings')
        .setDescriptionLocalizations({ ja: 'Steamゲーム開始通知の設定' })
        .addSubcommand((sub) =>
          sub
            .setName('setup')
            .setDescription('Set the Steam notification channel')
            .setDescriptionLocalizations({
              ja: 'Steam通知チャンネルを設定',
            })
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel to send Steam notifications to')
                .setDescriptionLocalizations({
                  ja: 'Steam通知を送信するチャンネル',
                })
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('status')
            .setDescription('Check Steam notification settings')
            .setDescriptionLocalizations({
              ja: 'Steam通知設定を確認',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('enable')
            .setDescription('Enable Steam notifications')
            .setDescriptionLocalizations({
              ja: 'Steam通知を有効化',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('disable')
            .setDescription('Disable Steam notifications')
            .setDescriptionLocalizations({
              ja: 'Steam通知を無効化',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Delete Steam notification settings entirely')
            .setDescriptionLocalizations({
              ja: 'Steam通知設定を完全に削除',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('me')
            .setDescription(
              'Check or change your own Steam notification status'
            )
            .setDescriptionLocalizations({
              ja: '自分のSteam通知設定を確認・変更',
            })
            .addStringOption((opt) =>
              opt
                .setName('action')
                .setDescription('What do you want to do?')
                .setDescriptionLocalizations({
                  ja: '何をしますか？',
                })
                .addChoices(
                  {
                    name: 'Check status',
                    name_localizations: { ja: '状態を確認' },
                    value: 'status',
                  },
                  {
                    name: 'Turn on notifications',
                    name_localizations: { ja: '通知をオン' },
                    value: 'on',
                  },
                  {
                    name: 'Turn off notifications',
                    name_localizations: { ja: '通知をオフ' },
                    value: 'off',
                  }
                )
            )
        )
    ) as SlashCommandBuilder,

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    // stats is available to everyone
    if (subcommand === 'stats') return handleStats(interaction);
    if (group === 'steam' && subcommand === 'me') {
      return executeSteamNotificationCommand(interaction);
    }

    // All other subcommands require ManageGuild
    if (
      !interactionHasGuildPermission(
        interaction,
        PermissionFlagsBits.ManageGuild
      )
    ) {
      const { createErrorEmbed } =
        await import('../../../shared/utils/embed.js');
      const { t, mapDiscordLocale } = await import('../../../locales/index.js');
      const locale = mapDiscordLocale(interaction.locale);
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

    if (group === 'voice') {
      if (subcommand === 'set') return handleVoiceSet(interaction);
      if (subcommand === 'disable') return handleVoiceRemove(interaction);
    }

    if (group === 'welcome') {
      if (subcommand === 'set') return handleWelcomeSet(interaction);
      if (subcommand === 'disable') return handleWelcomeRemove(interaction);
    }

    if (group === 'steam') {
      return executeSteamNotificationCommand(interaction);
    }

    if (subcommand === 'status') return handleStatus(interaction);
  },
};
