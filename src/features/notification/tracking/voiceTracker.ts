import { voiceSessionRepository } from '../repositories/voiceSessionRepository.js';
import { logger } from '../../../shared/utils/logger.js';

interface ActiveSession {
  sessionId: number;
  channelId: string;
  joinedAt: number;
}

const activeSessions = new Map<string, ActiveSession>();

function makeKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function startSession(
  guildId: string,
  userId: string,
  channelId: string,
  channelName: string
): void {
  const key = makeKey(guildId, userId);

  if (activeSessions.has(key)) {
    endSession(guildId, userId);
  }

  const sessionId = voiceSessionRepository.startSession(
    guildId,
    userId,
    channelId,
    channelName
  );

  activeSessions.set(key, {
    sessionId,
    channelId,
    joinedAt: Date.now(),
  });

  logger.debug(
    `Voice session started: user=${userId} channel=${channelId} session=${sessionId}`
  );
}

function endSession(guildId: string, userId: string): void {
  const key = makeKey(guildId, userId);
  const session = activeSessions.get(key);

  if (!session) return;

  voiceSessionRepository.endSession(session.sessionId);
  activeSessions.delete(key);

  logger.debug(
    `Voice session ended: user=${userId} session=${session.sessionId}`
  );
}

function getActiveSession(
  guildId: string,
  userId: string
): ActiveSession | undefined {
  return activeSessions.get(makeKey(guildId, userId));
}

function closeAllStaleSessions(): void {
  const closed = voiceSessionRepository.closeAllStaleSessions();
  if (closed > 0) {
    logger.info(`Closed ${closed} stale voice session(s) from previous run`);
  }
  activeSessions.clear();
}

export const voiceTracker = {
  startSession,
  endSession,
  getActiveSession,
  closeAllStaleSessions,
};
