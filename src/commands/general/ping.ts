import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { createEmbed } from '../../utils/embed.js';
import { COLORS } from '../../utils/constants.js';

/**
 * Ping command - check bot latency
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency'),

  middleware: ['cooldown'],

  options: {
    cooldown: 3000, // 3 seconds cooldown
  },

  async execute(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true });

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const embed = createEmbed({
      title: 'Pong!',
      color: COLORS.PRIMARY,
      fields: [
        {
          name: 'Roundtrip Latency',
          value: `${roundtripLatency}ms`,
          inline: true,
        },
        {
          name: 'WebSocket Latency',
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
