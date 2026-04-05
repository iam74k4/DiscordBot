import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../../shared/types/index.js';
import { createErrorEmbed } from '../../../shared/utils/embed.js';
import { steamClient } from '../integrations/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import {
  handleAutocomplete,
  handleChart,
  handleGames,
  handleHelp,
  handleHistory,
  handleHistoryGraph,
  handlePlaytime,
  handleProfile,
  handleRanking,
  handleRegister,
  handleRecent,
  handleUnregister,
  handleWhoami,
  executeServerCommand,
} from '../application/index.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('steam')
    .setDescription('Steam profiles, playtime, account links, and rankings')
    .setDescriptionLocalizations({
      ja: 'Steamプロフィール・連携・ランキング',
    })
    .addSubcommandGroup((group) =>
      group
        .setName('user')
        .setDescription('Steam profile and library commands')
        .setDescriptionLocalizations({
          ja: 'Steamプロフィールとライブラリ',
        })
        .addSubcommand((sub) =>
          sub
            .setName('profile')
            .setDescription('View Steam profile information')
            .setDescriptionLocalizations({
              ja: 'Steamプロフィールを表示',
            })
            .addStringOption((opt) =>
              opt
                .setName('steamid')
                .setDescription('Steam ID or registered user')
                .setDescriptionLocalizations({
                  ja: 'Steam ID または登録済みユーザー',
                })
                .setAutocomplete(true)
                .setMaxLength(100)
            )
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('playtime')
            .setDescription('View game playtime')
            .setDescriptionLocalizations({
              ja: 'ゲームプレイ時間を表示',
            })
            .addStringOption((opt) =>
              opt
                .setName('steamid')
                .setDescription('Steam ID or registered user')
                .setDescriptionLocalizations({
                  ja: 'Steam ID または登録済みユーザー',
                })
                .setAutocomplete(true)
                .setMaxLength(100)
            )
            .addStringOption((opt) =>
              opt
                .setName('game')
                .setDescription('Game name')
                .setDescriptionLocalizations({
                  ja: 'ゲーム名',
                })
                .setAutocomplete(true)
            )
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('games')
            .setDescription('Browse game library')
            .setDescriptionLocalizations({
              ja: 'ゲームライブラリを参照',
            })
            .addStringOption((opt) =>
              opt
                .setName('steamid')
                .setDescription('Steam ID or registered user')
                .setDescriptionLocalizations({
                  ja: 'Steam ID または登録済みユーザー',
                })
                .setAutocomplete(true)
                .setMaxLength(100)
            )
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('recent')
            .setDescription('View recently played games')
            .setDescriptionLocalizations({
              ja: '最近遊んだゲームを表示',
            })
            .addStringOption((opt) =>
              opt
                .setName('steamid')
                .setDescription('Steam ID or registered user')
                .setDescriptionLocalizations({
                  ja: 'Steam ID または登録済みユーザー',
                })
                .setAutocomplete(true)
                .setMaxLength(100)
            )
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('stats')
        .setDescription('Rankings, charts, and playtime trends')
        .setDescriptionLocalizations({
          ja: 'ランキング・チャート・推移',
        })
        .addSubcommand((sub) =>
          sub
            .setName('ranking')
            .setDescription('View server playtime ranking')
            .setDescriptionLocalizations({
              ja: 'サーバーのプレイ時間ランキングを表示',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('history')
            .setDescription('View playtime history')
            .setDescriptionLocalizations({
              ja: 'プレイ時間履歴を表示',
            })
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('chart')
            .setDescription('View playtime chart')
            .setDescriptionLocalizations({
              ja: 'プレイ時間チャートを表示',
            })
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('history-graph')
            .setDescription('View playtime history graph')
            .setDescriptionLocalizations({
              ja: 'プレイ時間履歴グラフを表示',
            })
            .addUserOption((opt) =>
              opt
                .setName('user')
                .setDescription('Discord user')
                .setDescriptionLocalizations({
                  ja: 'Discordユーザー',
                })
            )
            .addStringOption((opt) =>
              opt
                .setName('period')
                .setDescription('Time period')
                .setDescriptionLocalizations({
                  ja: '期間',
                })
                .addChoices(
                  {
                    name: '7 days',
                    name_localizations: { ja: '7日間' },
                    value: '7d',
                  },
                  {
                    name: '30 days',
                    name_localizations: { ja: '30日間' },
                    value: '30d',
                  },
                  {
                    name: '90 days',
                    name_localizations: { ja: '90日間' },
                    value: '90d',
                  },
                  {
                    name: '1 year',
                    name_localizations: { ja: '1年間' },
                    value: '1y',
                  }
                )
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('account')
        .setDescription('Steam account link management')
        .setDescriptionLocalizations({
          ja: 'Steamアカウント連携管理',
        })
        .addSubcommand((sub) =>
          sub
            .setName('register')
            .setDescription('Link your Steam account')
            .setDescriptionLocalizations({
              ja: 'Steamアカウントを連携',
            })
            .addStringOption((opt) =>
              opt
                .setName('steamid')
                .setDescription('Steam ID or custom URL')
                .setDescriptionLocalizations({
                  ja: 'Steam ID またはカスタムURL',
                })
                .setRequired(true)
                .setMaxLength(100)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('unregister')
            .setDescription('Unlink your Steam account')
            .setDescriptionLocalizations({
              ja: 'Steamアカウント連携を解除',
            })
        )
        .addSubcommand((sub) =>
          sub
            .setName('whoami')
            .setDescription('Show your linked account')
            .setDescriptionLocalizations({
              ja: '連携中のアカウントを表示',
            })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('server')
        .setDescription('Server-level Steam statistics')
        .setDescriptionLocalizations({
          ja: 'サーバー単位のSteam統計',
        })
        .addSubcommand((sub) =>
          sub
            .setName('stats')
            .setDescription('View server statistics')
            .setDescriptionLocalizations({
              ja: 'サーバー統計を表示',
            })
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('info')
        .setDescription('Usage guide and command reference')
        .setDescriptionLocalizations({
          ja: '使い方ガイドとコマンド一覧',
        })
        .addSubcommand((sub) =>
          sub
            .setName('help')
            .setDescription('Show command help')
            .setDescriptionLocalizations({
              ja: 'コマンドヘルプを表示',
            })
        )
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 5000,
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    const apiKeyRequiredSubcommands = new Set([
      'profile',
      'playtime',
      'games',
      'recent',
      'ranking',
      'history',
      'chart',
      'history-graph',
      'register',
    ]);

    if (
      apiKeyRequiredSubcommands.has(subcommand) &&
      !steamClient.isConfigured()
    ) {
      const locale = mapDiscordLocale(interaction.locale);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            t('common.error', locale),
            t('steam.errors.apiKeyNotConfigured', locale)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (group) {
      case 'user':
        switch (subcommand) {
          case 'profile':
            await handleProfile(interaction);
            break;
          case 'playtime':
            await handlePlaytime(interaction);
            break;
          case 'games':
            await handleGames(interaction);
            break;
          case 'recent':
            await handleRecent(interaction);
            break;
        }
        break;
      case 'stats':
        switch (subcommand) {
          case 'ranking':
            await handleRanking(interaction);
            break;
          case 'history':
            await handleHistory(interaction);
            break;
          case 'chart':
            await handleChart(interaction);
            break;
          case 'history-graph':
            await handleHistoryGraph(interaction);
            break;
        }
        break;
      case 'account':
        switch (subcommand) {
          case 'register':
            await handleRegister(interaction);
            break;
          case 'unregister':
            await handleUnregister(interaction);
            break;
          case 'whoami':
            await handleWhoami(interaction);
            break;
        }
        break;
      case 'server':
        await executeServerCommand(interaction);
        break;
      case 'info':
        if (subcommand === 'help') {
          await handleHelp(interaction);
        }
        break;
    }
  },

  async autocomplete(interaction) {
    await handleAutocomplete(interaction);
  },
};

export default command;
