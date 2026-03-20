import { ChatInputCommandInteraction } from 'discord.js';
import { mapDiscordLocale } from '../../../locales/index.js';
import { showNotificationPanel } from './panel.js';

type Period = 'today' | 'week' | 'month' | 'all';

export async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  const period = (interaction.options.getString('period') ?? 'all') as Period;
  await showNotificationPanel(interaction, locale, {
    initialView: 'stats',
    initialPeriod: period,
  });
}
