import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
  createEmbed,
  createErrorEmbed,
  createWarningEmbed,
} from '../../../utils/embed.js';
import { COLORS } from '../../../utils/constants/index.js';
import {
  steamClient,
  getStatusColor,
  PersonaState,
} from '../../../services/steam/index.js';
import {
  getSteamUser,
  registerSteamUser,
  unregisterSteamUser,
} from '../../../services/database/index.js';
import { t, mapDiscordLocale } from '../../../locales/index.js';

export async function handleRegister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const input = interaction.options.getString('steamid', true);
  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  const steamId = await steamClient.getSteamId64(input);

  if (!steamId) {
    const errorEmbed = createErrorEmbed(
      t('common.notFound', locale),
      t('steam.errors.invalidSteamId', locale) +
        '\n\n' +
        t('steam.register.validFormats', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(steamId);

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.errors.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  registerSteamUser(discordId, steamId, playerInfo.name);

  const embed = createEmbed({
    title: t('steam.register.title', locale),
    description: existing
      ? t('steam.register.updated', locale)
      : t('steam.register.linked', locale),
    color: COLORS.SUCCESS,
    fields: [
      {
        name: t('steam.profile.title', locale),
        value: `**${playerInfo.name}**\n[${t('steam.register.viewProfile', locale)}](${playerInfo.profileUrl})`,
        inline: true,
      },
      {
        name: t('steam.profile.steamId', locale),
        value: `\`${steamId}\``,
        inline: true,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

export async function handleUnregister(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordId = interaction.user.id;
  const existing = getSteamUser(discordId);

  if (!existing) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.unregister.notRegistered', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  unregisterSteamUser(discordId);

  const embed = createEmbed({
    title: t('steam.unregister.title', locale),
    description: t('steam.unregister.unlinked', locale),
    color: COLORS.SUCCESS,
    fields: [
      {
        name: t('steam.unregister.removedAccount', locale),
        value: `**${existing.steam_name || 'Unknown'}**\n\`${existing.steam_id}\``,
        inline: false,
      },
    ],
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

export async function handleWhoami(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);
  await interaction.deferReply();

  const discordId = interaction.user.id;
  const steamUser = getSteamUser(discordId);

  if (!steamUser) {
    const warningEmbed = createWarningEmbed(
      t('common.notFound', locale),
      t('steam.whoami.notRegistered', locale)
    );
    await interaction.editReply({ embeds: [warningEmbed] });
    return;
  }

  const playerInfo = await steamClient.getFormattedPlayerInfo(
    steamUser.steam_id
  );

  if (!playerInfo) {
    const errorEmbed = createErrorEmbed(
      t('common.error', locale),
      t('steam.errors.couldNotRetrieve', locale)
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  const registeredAt = new Date(steamUser.registered_at).toLocaleDateString(
    dateLocale,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const statusDisplay = playerInfo.currentGame
    ? `**${t('steam.profile.playing', locale)}:** ${playerInfo.currentGame}`
    : playerInfo.status;

  const embedColor = getStatusColor(
    playerInfo.currentGame ? PersonaState.Online : PersonaState.Offline,
    !!playerInfo.currentGame
  );

  const embed = createEmbed({
    title: t('steam.whoami.title', locale),
    description: `**${playerInfo.name}**\n\n${statusDisplay}\n\n[${t('steam.whoami.viewProfile', locale)}](${playerInfo.profileUrl})`,
    color: embedColor,
    fields: [
      {
        name: t('steam.profile.steamId', locale),
        value: `\`${steamUser.steam_id}\``,
        inline: true,
      },
      {
        name: t('steam.whoami.linkedSince', locale),
        value: registeredAt,
        inline: true,
      },
    ],
    thumbnail: playerInfo.avatarUrl,
    timestamp: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

export async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const locale = mapDiscordLocale(interaction.locale);

  const embed = createEmbed({
    title: t('steam.help.title', locale),
    description: t('steam.help.description', locale),
    color: COLORS.STEAM,
    fields: [
      {
        name: t('steam.help.accountSection', locale),
        value: t('steam.help.accountCommands', locale),
        inline: false,
      },
      {
        name: t('steam.help.statsSection', locale),
        value: t('steam.help.statsCommands', locale),
        inline: false,
      },
      {
        name: t('steam.help.optionsSection', locale),
        value: t('steam.help.optionsDesc', locale),
        inline: false,
      },
    ],
    footer: t('steam.help.autocompleteHint', locale),
    timestamp: true,
  });

  await interaction.reply({ embeds: [embed] });
}
