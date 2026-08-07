import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceState } from 'discord.js';
import {
  createMockClient,
  createMockGuild,
  createMockUser,
} from '../../../__tests__/helpers/discord.js';

const startSession = vi.fn();
const endSession = vi.fn();
const getEnabled = vi.fn();
const getSendableTextChannel = vi.fn();
const send = vi.fn();

vi.mock('../tracking/voiceTracker.js', () => ({
  voiceTracker: {
    startSession,
    endSession,
  },
}));

vi.mock('../repositories/notificationChannelRepository.js', () => ({
  notificationChannelRepository: {
    getEnabled,
  },
}));

vi.mock('../../../shared/utils/discord.js', () => ({
  getSendableTextChannel,
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
}));

vi.mock('../../../locales/index.js', () => ({
  mapDiscordLocale: () => 'en',
  t: (key: string) => key,
}));

function createVoiceState(overrides: {
  channelId?: string | null;
  channelName?: string;
  userId?: string;
  bot?: boolean;
}): VoiceState {
  const guild = createMockGuild({ preferredLocale: 'en-US' } as never);
  const user = createMockUser({
    id: overrides.userId ?? 'user-1',
    bot: overrides.bot ?? false,
  });
  const channel =
    overrides.channelId == null
      ? null
      : ({
          id: overrides.channelId,
          name: overrides.channelName ?? `channel-${overrides.channelId}`,
        } as VoiceState['channel']);

  return {
    guild,
    channel,
    member: {
      user,
      displayName: user.displayName,
    },
  } as unknown as VoiceState;
}

describe('voiceNotification event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEnabled.mockReturnValue('notify-channel');
    getSendableTextChannel.mockResolvedValue({ send });
    send.mockResolvedValue(undefined);
  });

  it('completes move session transition before awaiting leave notification', async () => {
    const { event } = await import('../events/voiceNotification.js');
    const client = Object.assign(createMockClient(), { isFullyReady: true });

    let releaseLeaveSend!: () => void;
    const leaveSendGate = new Promise<void>((resolve) => {
      releaseLeaveSend = resolve;
    });

    let sendCalls = 0;
    send.mockImplementation(() => {
      sendCalls += 1;
      if (sendCalls === 1) {
        return leaveSendGate;
      }
      return Promise.resolve(undefined);
    });

    const order: string[] = [];
    endSession.mockImplementation(() => {
      order.push('endSession');
    });
    startSession.mockImplementation(() => {
      order.push('startSession');
    });

    const oldState = createVoiceState({
      channelId: 'vc-a',
      channelName: 'A',
    });
    const newState = createVoiceState({
      channelId: 'vc-b',
      channelName: 'B',
    });

    const movePromise = event.execute(client as never, oldState, newState);

    // Flush microtasks so handleMove reaches the first awaited Discord send.
    await Promise.resolve();
    await Promise.resolve();

    // Session transition must be done before the first Discord send resolves.
    expect(order).toEqual(['endSession', 'startSession']);
    expect(endSession).toHaveBeenCalledWith(oldState.guild.id, 'user-1');
    expect(startSession).toHaveBeenCalledWith(
      newState.guild.id,
      'user-1',
      'vc-b',
      'B'
    );
    expect(sendCalls).toBe(1);

    // Concurrent leave while leave-notify is in flight ends the already-started
    // destination session instead of racing ahead of startSession.
    endSession.mockClear();
    const leaveState = createVoiceState({
      channelId: 'vc-b',
      channelName: 'B',
    });
    const emptyState = createVoiceState({ channelId: null });
    await event.execute(client as never, leaveState, emptyState);
    expect(endSession).toHaveBeenCalledWith(leaveState.guild.id, 'user-1');

    releaseLeaveSend();
    await movePromise;

    // Move must not call startSession again after the concurrent leave.
    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it('starts a session on join before sending the join notification', async () => {
    const { event } = await import('../events/voiceNotification.js');
    const client = Object.assign(createMockClient(), { isFullyReady: true });

    const order: string[] = [];
    startSession.mockImplementation(() => {
      order.push('startSession');
    });
    send.mockImplementation(async () => {
      order.push('send');
    });

    const oldState = createVoiceState({ channelId: null });
    const newState = createVoiceState({
      channelId: 'vc-a',
      channelName: 'A',
    });

    await event.execute(client as never, oldState, newState);

    expect(order).toEqual(['startSession', 'send']);
  });
});
