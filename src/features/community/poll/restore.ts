import type { Client } from 'discord.js';
import { getErrorMessage, logger } from '../../../shared/utils/logger.js';
import { pollRepository } from './pollRepository.js';
import { pollStore, type PollData } from './pollStore.js';
import { endPoll } from './pollService.js';

/**
 * Re-arm stored polls after a restart.
 *
 * Discord keeps showing the poll message with working buttons across a
 * deploy, so without this the tally is lost and every click answers "this
 * poll has ended". Polls whose deadline passed while the bot was down are
 * closed immediately so their results still get published.
 */
export async function restorePolls(client: Client): Promise<void> {
  let stored;
  try {
    stored = pollRepository.listAll();
  } catch (error) {
    logger.error(`Failed to load stored polls: ${getErrorMessage(error)}`);
    return;
  }

  if (stored.length === 0) return;

  const now = Date.now();
  const expired: string[] = [];
  let restored = 0;

  for (const poll of stored) {
    const data: PollData = {
      question: poll.question,
      options: poll.options,
      votes: poll.votes,
      creatorId: poll.creatorId,
      anonymous: poll.anonymous,
      endsAt: poll.endsAt ?? undefined,
      channelId: poll.channelId,
      guildId: poll.guildId,
      client,
      locale: poll.locale,
    };

    pollStore.restore(poll.messageId, data);
    restored++;

    if (poll.endsAt === null) continue;

    if (poll.endsAt <= now) {
      expired.push(poll.messageId);
      continue;
    }

    data.timeout = setTimeout(() => {
      void endPoll(poll.messageId, client).catch((error: unknown) => {
        logger.error(
          `Failed to auto-end restored poll ${poll.messageId}:`,
          getErrorMessage(error)
        );
      });
    }, poll.endsAt - now);
  }

  logger.info(`Restored ${restored} active poll(s)`);

  for (const messageId of expired) {
    try {
      await endPoll(messageId, client);
    } catch (error) {
      logger.error(
        `Failed to close expired poll ${messageId}:`,
        getErrorMessage(error)
      );
    }
  }

  if (expired.length > 0) {
    logger.info(`Closed ${expired.length} poll(s) that expired while offline`);
  }
}
