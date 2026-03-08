import { AutocompleteInteraction } from 'discord.js';
import { steamClient } from '../services/steam/index.js';
import { steamUserRepository } from '../repositories/index.js';
import { smartFilter } from '../../../utils/fuzzy.js';
import {
  CACHE_TTL,
  gameCache,
  userCache,
  formatHoursShort,
} from '../lib/shared.js';

export async function handleAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'game') {
    const query = focusedOption.value;
    const discordId = interaction.user.id;
    const steamId = steamUserRepository.getSteamId(discordId);

    if (!steamId) {
      await interaction.respond([]);
      return;
    }

    const cached = gameCache.get(discordId);
    let games: { name: string; playtime: number }[];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      games = cached.games;
    } else {
      const ownedGames = await steamClient.getOwnedGames(steamId);
      games = ownedGames
        .filter((g) => g.name)
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .map((g) => ({ name: g.name!, playtime: g.playtime_forever }));

      gameCache.set(discordId, { games, timestamp: Date.now() });
    }

    const filtered = smartFilter(games, query, (g) => g.name)
      .slice(0, 25)
      .map((g) => {
        const displayName = `${g.name} (${formatHoursShort(g.playtime)})`;
        return {
          name: displayName.slice(0, 100),
          value: g.name.slice(0, 100),
        };
      });

    await interaction.respond(filtered);
    return;
  }

  if (focusedOption.name === 'steamid') {
    const query = focusedOption.value;

    let users: { name: string; steamId: string }[];

    if (userCache && Date.now() - userCache.timestamp < CACHE_TTL) {
      users = userCache.users;
    } else {
      const allUsers = steamUserRepository.getAll();
      users = allUsers.map((u) => ({
        name: u.steam_name || 'Unknown',
        steamId: u.steam_id,
      }));
      userCache.users = users;
      userCache.timestamp = Date.now();
    }

    const filtered = smartFilter(users, query, (u) => u.name)
      .slice(0, 25)
      .map((u) => {
        const shortId = u.steamId.slice(-6);
        const displayName = `${u.name} (...${shortId})`;
        return {
          name: displayName.slice(0, 100),
          value: u.steamId,
        };
      });

    await interaction.respond(filtered);
    return;
  }
}
