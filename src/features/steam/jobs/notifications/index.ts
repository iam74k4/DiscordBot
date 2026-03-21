import { Client, TextChannel } from 'discord.js';
import { getErrorMessage, logger } from '../../../../shared/utils/logger.js';
import { createEmbed } from '../../../../shared/utils/embed.js';
import { COLORS, TITLES } from '../../../../shared/utils/constants/index.js';
import { steamClient } from '../../integrations/steam/index.js';
import { steamNotificationRepository } from '../../repositories/index.js';
import { getSendableTextChannel } from '../../../../shared/utils/discord.js';

// Check interval: 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000;
// Timeout for notification processing (5 minutes)
const PROCESSING_TIMEOUT = 5 * 60 * 1000;

let notificationClient: Client | null = null;
let checkInterval: NodeJS.Timeout | null = null;
let warmupTimeout: NodeJS.Timeout | null = null;
let notificationSystemStarted = false;

/**
 * Promise-based mutex that prevents concurrent notification processing.
 * Uses an atomic acquire/release pattern to avoid TOCTOU race conditions.
 * If the lock is already held, `tryRunExclusive` returns undefined immediately.
 */
class AsyncMutex {
  private _lock: Promise<void> = Promise.resolve();
  private _held = false;

  async tryRunExclusive<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this._held) return undefined;

    let releaseFn!: () => void;
    const prev = this._lock;
    this._lock = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });
    this._held = true;

    await prev;

    try {
      return await fn();
    } finally {
      this._held = false;
      releaseFn();
    }
  }
}

const processingMutex = new AsyncMutex();

/**
 * Game start event data
 */
interface GameStartEvent {
  discordId: string;
  steamName: string;
  gameName: string;
  avatarUrl?: string;
}

/**
 * Check for game activity changes
 */
async function checkGameActivity(
  signal?: AbortSignal
): Promise<GameStartEvent[]> {
  if (!steamClient.isConfigured()) {
    logger.debug('Steam API key not configured, skipping game activity check');
    return [];
  }

  const events: GameStartEvent[] = [];
  const users = steamNotificationRepository.getNotifiableUsers();

  const BATCH_SIZE = 20;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    try {
      const summaries = await steamClient.getPlayerSummaries(
        batch.map((user) => user.steam_id),
        signal
      );
      const summaryBySteamId = new Map(
        summaries.map((summary) => [summary.steamid, summary])
      );

      for (const user of batch) {
        const player = summaryBySteamId.get(user.steam_id);
        if (!player) continue;

        const currentGame = player.gameextrainfo || null;
        const cache = steamNotificationRepository.getGameActivityCache(
          user.discord_id
        );

        if (currentGame && (!cache || cache.current_game !== currentGame)) {
          events.push({
            discordId: user.discord_id,
            steamName: player.personaname,
            gameName: currentGame,
            avatarUrl: player.avatarfull,
          });
        }

        steamNotificationRepository.updateGameActivityCache(
          user.discord_id,
          currentGame,
          currentGame && (!cache || cache.current_game !== currentGame)
            ? Date.now()
            : (cache?.game_started_at ?? null)
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      logger.warn(
        `Failed to fetch Steam activity batch ${i / BATCH_SIZE + 1}:`,
        getErrorMessage(error)
      );
    }

    if (signal?.aborted) {
      break;
    }

    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
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
    thumbnail: event.avatarUrl,
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

  const client = notificationClient;

  await processingMutex.tryRunExclusive(async () => {
    const ac = new AbortController();
    const timeout = setTimeout(() => {
      logger.error('Notification processing timed out');
      ac.abort();
    }, PROCESSING_TIMEOUT);

    try {
      const events = await checkGameActivity(ac.signal);

      if (events.length === 0) return;

      logger.debug(`Found ${events.length} game start events`);

      const enabledGuilds = steamNotificationRepository.getEnabledGuilds();

      for (const guildSettings of enabledGuilds) {
        if (ac.signal.aborted) break;

        try {
          const guild = client.guilds.cache.get(guildSettings.guild_id);
          if (!guild) continue;

          const channel = await getSendableTextChannel(
            guild,
            guildSettings.channel_id
          );
          if (!channel) continue;

          const relevantIds = events.map((e) => e.discordId);
          const members = await guild.members
            .fetch({ user: relevantIds })
            .catch(() => guild.members.cache);
          const memberIds = new Set(members.map((m) => m.id));

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
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Notification processing aborted due to timeout');
      } else {
        logger.error('Failed to process notifications:', error);
      }
    } finally {
      clearTimeout(timeout);
    }
  });
}

/**
 * Start the notification system
 */
export function startNotificationSystem(client: Client): void {
  if (notificationSystemStarted) {
    logger.debug(
      'Notification system already started, skipping duplicate start'
    );
    notificationClient = client;
    return;
  }

  notificationSystemStarted = true;
  notificationClient = client;

  logger.info('Starting notification system...');

  // Initial check after 1 minute (give time for caches to warm up)
  warmupTimeout = setTimeout(() => {
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
  if (warmupTimeout) {
    clearTimeout(warmupTimeout);
    warmupTimeout = null;
  }

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  notificationSystemStarted = false;
  notificationClient = null;
  logger.info('Notification system stopped');
}

/**
 * Manually trigger a check (for testing)
 */
export async function triggerNotificationCheck(): Promise<void> {
  await processNotifications();
}
