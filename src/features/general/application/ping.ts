import { ChatInputCommandInteraction } from 'discord.js';
import { createEmbed } from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

export async function executePingCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const sent = await interaction.deferReply({ fetchReply: true });

  const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
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
}
