import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../../types/index.js';
import { createErrorEmbed } from '../../../utils/embed.js';
import { steamClient } from '../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

import { handleProfile } from './handlers/profile.js';
import { handlePlaytime } from './handlers/playtime.js';
import { handleGames } from './handlers/games.js';
import { handleRecent } from './handlers/recent.js';
import { handleRanking } from './handlers/ranking.js';
import { handleHistory, handleHistoryGraph } from './handlers/history.js';
import {
  handleRegister,
  handleUnregister,
  handleWhoami,
  handleHelp,
} from './handlers/account.js';
import { handleChart } from './handlers/chart.js';
import { handleAutocomplete } from './handlers/autocomplete.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('steam')
    .setDescription('Steam integration commands')
    .addSubcommand((sub) =>
      sub
        .setName('profile')
        .setDescription('View Steam profile information')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
            .setMaxLength(100)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('playtime')
        .setDescription('View game playtime')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
            .setMaxLength(100)
        )
        .addStringOption((opt) =>
          opt.setName('game').setDescription('Game name').setAutocomplete(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('games')
        .setDescription('Browse game library')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
            .setMaxLength(100)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('recent')
        .setDescription('View recently played games')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or registered user')
            .setAutocomplete(true)
            .setMaxLength(100)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('ranking').setDescription('View server playtime ranking')
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View playtime history')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('chart')
        .setDescription('View playtime chart')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('history-graph')
        .setDescription('View playtime history graph')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Discord user')
        )
        .addStringOption((opt) =>
          opt
            .setName('period')
            .setDescription('Time period')
            .addChoices(
              { name: '7 Days', value: '7d' },
              { name: '30 Days', value: '30d' },
              { name: '90 Days', value: '90d' },
              { name: '1 Year', value: '1y' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('register')
        .setDescription('Link your Steam account')
        .addStringOption((opt) =>
          opt
            .setName('steamid')
            .setDescription('Steam ID or custom URL')
            .setRequired(true)
            .setMaxLength(100)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('unregister').setDescription('Unlink your Steam account')
    )
    .addSubcommand((sub) =>
      sub.setName('whoami').setDescription('Show your linked account')
    )
    .addSubcommand((sub) =>
      sub.setName('help').setDescription('Show command help')
    ),

  middleware: ['cooldown'],

  options: {
    cooldown: 5000,
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    const noApiKeyRequired = new Set(['unregister', 'whoami', 'help']);

    if (!noApiKeyRequired.has(subcommand) && !steamClient.isConfigured()) {
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
      case 'register':
        await handleRegister(interaction);
        break;
      case 'unregister':
        await handleUnregister(interaction);
        break;
      case 'whoami':
        await handleWhoami(interaction);
        break;
      case 'help':
        await handleHelp(interaction);
        break;
    }
  },

  async autocomplete(interaction) {
    await handleAutocomplete(interaction);
  },
};

export default command;
