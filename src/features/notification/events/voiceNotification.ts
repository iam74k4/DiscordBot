import { Events, Guild, VoiceState } from 'discord.js';
import { Event } from '../../../shared/types/index.js';
import { ExtendedClient } from '../../../client.js';
import { createEmbed } from '../../../shared/utils/embed.js';
import { COLORS } from '../../../shared/utils/constants/index.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { t, mapDiscordLocale, type Locale } from '../../../locales/index.js';
import { resolveGuildLocale } from '../../../locales/guildLocale.js';
import { notificationChannelRepository } from '../repositories/notificationChannelRepository.js';
import { voiceTracker } from '../tracking/voiceTracker.js';
import { getSendableTextChannel } from '../../../shared/utils/discord.js';
import {
  isVoiceDigestEmpty,
  summarizeVoiceActivity,
  type VoiceActivity,
  type VoiceDigest,
} from '../application/voiceDigest.js';

/**
 * How long a guild's voice notifications stay batched after one is sent.
 *
 * This is a throttle with a trailing digest, not a plain debounce: the first
 * change is announced immediately so "someone is in the call" still arrives
 * promptly, and everything that follows within the window is collapsed into a
 * single summary. A channel filling up costs two messages instead of ten.
 */
const DIGEST_WINDOW_MS = 30_000;

interface DigestWindow {
  timer: NodeJS.Timeout;
  buffered: VoiceActivity[];
  guild: Guild;
}

/** Open windows keyed by guild id. */
const windows = new Map<string, DigestWindow>();

export const event: Event<typeof Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(
    client: ExtendedClient,
    oldState: VoiceState,
    newState: VoiceState
  ) {
    if (!client.isFullyReady) return;
    if (newState.member?.user.bot) return;

    const guildId = newState.guild.id;

    if (!oldState.channel && newState.channel) {
      await handleJoin(guildId, newState);
      return;
    }

    if (oldState.channel && !newState.channel) {
      await handleLeave(guildId, oldState);
      return;
    }

    if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await handleMove(guildId, oldState, newState);
    }
  },
};

function startSessionFromState(guildId: string, state: VoiceState): void {
  if (!state.member || !state.channel) return;
  voiceTracker.startSession(
    guildId,
    state.member.user.id,
    state.channel.id,
    state.channel.name
  );
}

function endSessionFromState(guildId: string, state: VoiceState): void {
  if (!state.member) return;
  voiceTracker.endSession(guildId, state.member.user.id);
}

function toActivity(
  state: VoiceState,
  kind: VoiceActivity['kind']
): VoiceActivity | null {
  if (!state.member || !state.channel) return null;
  return {
    userId: state.member.user.id,
    displayName: state.member.displayName,
    channelId: state.channel.id,
    kind,
  };
}

async function handleJoin(guildId: string, state: VoiceState): Promise<void> {
  try {
    startSessionFromState(guildId, state);
  } catch (error) {
    logger.error(`Failed to start voice session: ${getErrorMessage(error)}`);
  }

  await recordActivity(guildId, state.guild, [toActivity(state, 'join')]);
}

async function handleLeave(guildId: string, state: VoiceState): Promise<void> {
  try {
    endSessionFromState(guildId, state);
  } catch (error) {
    logger.error(`Failed to end voice session: ${getErrorMessage(error)}`);
  }

  await recordActivity(guildId, state.guild, [toActivity(state, 'leave')]);
}

/**
 * Move must finish the session transition before any Discord I/O.
 * Event listeners are not awaited by the dispatcher, so a concurrent leave
 * during leave-notify can otherwise race ahead of startSession and leave a
 * ghost open session for a channel the user already left.
 */
async function handleMove(
  guildId: string,
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  try {
    endSessionFromState(guildId, oldState);
    startSessionFromState(guildId, newState);
  } catch (error) {
    logger.error(
      `Failed to transition voice session on move: ${getErrorMessage(error)}`
    );
  }

  // Both halves are handed over together so a move outside an open window is
  // still reported as one line rather than a leave now and a join later.
  await recordActivity(guildId, newState.guild, [
    toActivity(oldState, 'leave'),
    toActivity(newState, 'join'),
  ]);
}

/**
 * Announce immediately when the guild has no open window, otherwise buffer
 * until the window closes.
 */
async function recordActivity(
  guildId: string,
  guild: Guild,
  activities: ReadonlyArray<VoiceActivity | null>
): Promise<void> {
  const events = activities.filter((a): a is VoiceActivity => a !== null);
  if (events.length === 0) return;

  const open = windows.get(guildId);
  if (open) {
    open.buffered.push(...events);
    open.guild = guild;
    return;
  }

  if (!notificationChannelRepository.getEnabled(guildId, 'voice')) return;

  windows.set(guildId, {
    buffered: [],
    guild,
    timer: setTimeout(() => void closeWindow(guildId), DIGEST_WINDOW_MS),
  });

  await sendDigest(guild, summarizeVoiceActivity(events));
}

/**
 * Flush whatever accumulated. A window that collected nothing closes; one
 * that did stays open so a continuing burst keeps being batched.
 */
async function closeWindow(guildId: string): Promise<void> {
  const open = windows.get(guildId);
  if (!open) return;

  if (open.buffered.length === 0) {
    windows.delete(guildId);
    return;
  }

  const digest = summarizeVoiceActivity(open.buffered);
  open.buffered = [];
  open.timer = setTimeout(() => void closeWindow(guildId), DIGEST_WINDOW_MS);

  if (!isVoiceDigestEmpty(digest)) {
    await sendDigest(open.guild, digest);
  }
}

function digestLines(digest: VoiceDigest, locale: Locale): string[] {
  return [
    ...digest.joined.map((entry) =>
      t('notification.events.voiceJoin', locale, {
        name: entry.displayName,
        channel: entry.channelId,
      })
    ),
    ...digest.moved.map((entry) =>
      t('notification.events.voiceMove', locale, {
        name: entry.displayName,
        from: entry.fromChannelId,
        to: entry.toChannelId,
      })
    ),
    ...digest.left.map((entry) =>
      t('notification.events.voiceLeave', locale, {
        name: entry.displayName,
        channel: entry.channelId,
      })
    ),
  ];
}

async function sendDigest(guild: Guild, digest: VoiceDigest): Promise<void> {
  if (isVoiceDigestEmpty(digest)) return;

  const notifyChannelId = notificationChannelRepository.getEnabled(
    guild.id,
    'voice'
  );
  if (!notifyChannelId) return;

  try {
    const textChannel = await getSendableTextChannel(guild, notifyChannelId);
    if (!textChannel) return;

    const locale = resolveGuildLocale(
      guild.id,
      mapDiscordLocale(guild.preferredLocale)
    );
    const lines = digestLines(digest, locale);
    // A single change keeps its old one-line look; only a real batch gets a
    // heading, so the common case is not made noisier by the batching.
    const isBatch = lines.length > 1;

    const embed = createEmbed({
      title: isBatch
        ? t('notification.events.voiceDigestTitle', locale)
        : undefined,
      description: lines.join('\n'),
      color:
        digest.joined.length > 0 || digest.moved.length > 0
          ? COLORS.SUCCESS
          : COLORS.ERROR,
      timestamp: true,
    });

    await textChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(
      `Failed to send voice notification digest: ${getErrorMessage(error)}`
    );
  }
}

/**
 * Drop every open window. Called on shutdown so pending timers cannot keep
 * the process alive or fire against a destroyed client.
 */
export function resetVoiceDigests(): void {
  for (const open of windows.values()) {
    clearTimeout(open.timer);
  }
  windows.clear();
}
