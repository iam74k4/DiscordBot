import { Client, TextChannel } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { createEmbed } from '../../utils/embed.js';
import { COLORS, TITLES } from '../../utils/constants.js';
import { steamClient } from '../steam/index.js';
import { getAllSteamUsers } from '../database/index.js';
import {
  getEnabledNotificationGuilds,
  getGameActivityCache,
  updateGameActivityCache,
  getUserNotificationPref,
} from '../database/notifications.js';

// Check interval: 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000;

let notificationClient: Client | null = null;
let checkInterval: NodeJS.Timeout | null = null;

/**
 * Game start event data
 */
interface GameStartEvent {
  discordId: string;
  steamId: string;
  steamName: string;
  gameName: string;
  gameIconUrl?: string;
}

/**
 * Check for game activity changes
 */
async function checkGameActivity(): Promise<GameStartEvent[]> {
  const events: GameStartEvent[] = [];
  const users = getAllSteamUsers();

  for (const user of users) {
    try {
      // Check if user has notifications enabled
      if (!getUserNotificationPref(user.discord_id)) {
        continue;
      }

      // Get current player info
      const playerInfo = await steamClient.getFormattedPlayerInfo(
        user.steam_id
      );
      if (!playerInfo) continue;

      const currentGame = playerInfo.currentGame || null;
      const cache = getGameActivityCache(user.discord_id);

      // Check if game started (was not playing, now playing)
      if (currentGame && (!cache || cache.current_game !== currentGame)) {
        events.push({
          discordId: user.discord_id,
          steamId: user.steam_id,
          steamName: playerInfo.name,
          gameName: currentGame,
          gameIconUrl: playerInfo.avatarUrl,
        });
      }

      // Update cache
      updateGameActivityCache(
        user.discord_id,
        currentGame,
        currentGame && (!cache || cache.current_game !== currentGame)
          ? Date.now()
          : (cache?.game_started_at ?? null)
      );

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch {
      // Skip users with errors
      continue;
    }
  }

  return events;
}

/**
 * Send notification to a channel
 */
async function sendNotification(
  channel: TextChannel,
  event: GameStartEvent
): Promise<void> {
  const embed = createEmbed({
    title: TITLES.NOW_PLAYING,
    description:
      `**${event.steamName}** started playing\n\n` + `**${event.gameName}**`,
    color: COLORS.STEAM,
    thumbnail: event.gameIconUrl,
    footer: `Steam ID: ${event.steamId}`,
    timestamp: true,
  });

  await channel.send({
    content: `<@${event.discordId}>`,
    embeds: [embed],
  });
}

/**
 * Process game activity and send notifications
 */
async function processNotifications(): Promise<void> {
  if (!notificationClient) return;

  try {
    const events = await checkGameActivity();

    if (events.length === 0) return;

    logger.debug(`Found ${events.length} game start events`);

    // Get all guilds with notifications enabled
    const enabledGuilds = getEnabledNotificationGuilds();

    for (const guildSettings of enabledGuilds) {
      try {
        const guild = notificationClient.guilds.cache.get(
          guildSettings.guild_id
        );
        if (!guild) continue;

        const channel = guild.channels.cache.get(
          guildSettings.channel_id
        ) as TextChannel;
        if (!channel) continue;

        // Get guild member IDs
        await guild.members.fetch();
        const memberIds = new Set(guild.members.cache.map((m) => m.id));

        // Send notifications for guild members
        for (const event of events) {
          if (memberIds.has(event.discordId)) {
            await sendNotification(channel, event);
          }
        }
      } catch (error) {
        logger.error(
          `Failed to send notification to guild ${guildSettings.guild_id}:`,
          error
        );
      }
    }
  } catch (error) {
    logger.error('Failed to process notifications:', error);
  }
}

/**
 * Start the notification system
 */
export function startNotificationSystem(client: Client): void {
  notificationClient = client;

  logger.info('Starting notification system...');

  // Initial check after 1 minute (give time for caches to warm up)
  setTimeout(() => {
    processNotifications();
  }, 60 * 1000);

  // Regular checks
  checkInterval = setInterval(() => {
    processNotifications();
  }, CHECK_INTERVAL);

  logger.info(
    `Notification system started (checking every ${CHECK_INTERVAL / 60000} minutes)`
  );
}

/**
 * Stop the notification system
 */
export function stopNotificationSystem(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  notificationClient = null;
  logger.info('Notification system stopped');
}

/**
 * Manually trigger a check (for testing)
 */
export async function triggerNotificationCheck(): Promise<void> {
  await processNotifications();
}
