import { ChatInputCommandInteraction } from 'discord.js';
import { resolveLocale } from '../../../locales/guildLocale.js';
import { showNotificationPanel } from './panel.js';

type Period = 'today' | 'week' | 'month' | 'all';

export async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = resolveLocale(interaction);
  const period = (interaction.options.getString('period') ?? 'all') as Period;
  await showNotificationPanel(interaction, locale, {
    initialView: 'stats',
    initialPeriod: period,
  });
}
