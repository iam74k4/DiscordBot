import { ChatInputCommandInteraction } from 'discord.js';
import { createEmbed, createErrorEmbed } from '../../../utils/embed.js';
import {
  steamClient,
  getStatusColor,
  getVisibilityIcon,
  PersonaState,
} from '../../../services/steam/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';
import { resolveSteamId } from '../shared.js';

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

  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const statusDisplay = playerInfo.currentGame
    ? `**${t('steam.profile.playing', locale)}:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const visibilityText = playerInfo.isPublic
    ? t('steam.profile.publicProfile', locale)
    : t('steam.profile.privateProfile', locale);
  const visibilityInfo = `${getVisibilityIcon(playerInfo.isPublic)} ${visibilityText}`;

  let description = `${visibilityInfo}\n\n${statusDisplay}`;
  if (!playerInfo.isPublic) {
    description += `\n\n*${t('steam.profile.privacyNote', locale)}*`;
  }

  const fields = [];
  const profileInfo = [];

  if (playerInfo.realName)
    profileInfo.push(
      `**${t('steam.profile.realName', locale)}:** ${playerInfo.realName}`
    );
  if (playerInfo.country)
    profileInfo.push(
      `**${t('steam.profile.country', locale)}:** ${playerInfo.country}`
    );
  if (playerInfo.createdAt) {
    const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
    const memberSince = playerInfo.createdAt.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    profileInfo.push(
      `**${t('steam.profile.memberSince', locale)}:** ${memberSince}`
    );
  }

  if (profileInfo.length > 0) {
    fields.push({
      name: t('steam.profile.profileInfo', locale),
      value: profileInfo.join('\n'),
      inline: false,
    });
  }

  fields.push({
    name: t('steam.profile.steamId', locale),
    value: `\`${playerInfo.steamId}\``,
    inline: true,
  });
  fields.push({
    name: t('steam.profile.profileLink', locale),
    value: `[${t('steam.profile.viewOnSteam', locale)}](${playerInfo.profileUrl})`,
    inline: true,
  });

  const embed = createEmbed({
    title: playerInfo.name,
    description,
    color: embedColor,
    fields,
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}
