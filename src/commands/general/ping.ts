import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../locales/index.js';

/**
 * Ping command - check bot latency
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency')
    .setDescriptionLocalizations({
      ja: 'Botのレイテンシを確認',
    }),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000, // 3 seconds cooldown
  },

  async execute(interaction) {
    const locale = mapDiscordLocale(interaction.locale);
    const sent = await interaction.deferReply({ fetchReply: true });

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const embed = createEmbed({
      title: t('ping.title', locale),
      color: COLORS.PRIMARY,
      fields: [
        {
          name: t('ping.latency', locale),
          value: `${roundtripLatency}ms`,
          inline: true,
        },
        {
          name: t('ping.apiLatency', locale),
          value: `${wsLatency}ms`,
          inline: true,
        },
      ],
      timestamp: true,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
