import { ChatInputCommandInteraction } from 'discord.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { t } from '../../../locales/index.js';
import { resolveLocale } from '../../../locales/guildLocale.js';

export async function executePingCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
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
