import { ChatInputCommandInteraction } from 'discord.js';
import { createErrorEmbed } from '../../../shared/utils/embed.js';
import { steamClient } from '../integrations/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveSteamId } from '../domain/shared.js';
import { showSteamProfileDashboard } from './dashboard.js';

export async function handleProfile(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const { steamId, error } = await resolveSteamId(interaction, locale);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      error ?? t('steam.errors.couldNotResolve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      t('steam.errors.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  await showSteamProfileDashboard(interaction, locale, steamId, playerInfo);
}
