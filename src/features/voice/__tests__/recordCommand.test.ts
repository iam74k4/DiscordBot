import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getConnection = vi.hoisted(() => vi.fn());
const recordAudio = vi.hoisted(() => vi.fn());

vi.mock('../recording/connectionManager.js', () => ({
  connectionManager: {
    getConnection,
  },
}));

vi.mock('../recording/recordingService.js', () => ({
  parseDurationString: (value: string) => {
    if (value === '5m') return 300;
    throw new Error('Invalid duration format');
  },
  recordAudio,
  RecordingNoAudibleAudioError: class RecordingNoAudibleAudioError extends Error {
    constructor() {
      super('No audible audio');
      this.name = 'RecordingNoAudibleAudioError';
    }
  },
}));

vi.mock('../../../config/index.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../config/index.js')
  >('../../../config/index.js');
  return {
    ...actual,
    env: {
      ...actual.env,
      MAX_RECORDING_DURATION: 300,
      AUDIO_BUFFER_DURATION: 600,
    },
    RETRY: {
      ...actual.RETRY,
      RECORDING_RETRY_MAX: 0,
    },
  };
});

import { executeRecordCommand } from '../application/record.js';
import { metrics } from '../../../infrastructure/metrics/index.js';

function createRecordInteraction(
  followUpImpl: (payload: unknown) => Promise<unknown>
): ChatInputCommandInteraction {
  const voiceChannel = {
    id: 'voice-1',
    name: 'General',
    type: ChannelType.GuildVoice,
  };

  const permissions = {
    has: vi.fn((flag: bigint) => {
      return (
        flag === PermissionFlagsBits.AttachFiles ||
        flag === PermissionFlagsBits.ViewChannel
      );
    }),
  };

  return {
    locale: 'en-US',
    user: { id: 'user-1', tag: 'User#0001' },
    member: {
      voice: { channel: voiceChannel },
    },
    guild: {
      id: 'guild-1',
      members: {
        me: { id: 'bot-1' },
      },
    },
    channel: {
      id: 'text-1',
      permissionsFor: vi.fn().mockReturnValue(permissions),
    },
    options: {
      getString: vi.fn().mockReturnValue('5m'),
    },
    deferReply: vi.fn().mockResolvedValue({}),
    editReply: vi.fn().mockResolvedValue({}),
    followUp: vi.fn(followUpImpl),
  } as unknown as ChatInputCommandInteraction;
}

describe('executeRecordCommand split delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnection.mockReturnValue({ channelId: 'voice-1' });
    recordAudio.mockResolvedValue({
      filePath: '/tmp/recording_part1.wav',
      fileSize: 24 * 1024 * 1024,
      duration: 300,
      isSplit: true,
      additionalFiles: ['/tmp/recording_part2.wav'],
    });
  });

  it('notifies the user when a split part fails after retries', async () => {
    let followUpCalls = 0;
    const interaction = createRecordInteraction(async () => {
      followUpCalls += 1;
      if (followUpCalls === 1) {
        return {};
      }
      throw new Error('upload failed');
    });

    await executeRecordCommand(interaction);

    const payloads = vi
      .mocked(interaction.followUp)
      .mock.calls.map(([payload]) => payload as Record<string, unknown>);

    const incomplete = payloads.find(
      (payload) =>
        Array.isArray(payload.embeds) &&
        JSON.stringify(payload.embeds).includes('Delivery Incomplete')
    );

    expect(incomplete).toBeDefined();
    expect(incomplete?.flags).toBe(MessageFlags.Ephemeral);
  });

  it('does not warn when every split part is delivered', async () => {
    const interaction = createRecordInteraction(async () => ({}));

    await executeRecordCommand(interaction);

    const payloads = vi
      .mocked(interaction.followUp)
      .mock.calls.map(([payload]) => payload as Record<string, unknown>);
    const incomplete = payloads.find(
      (payload) =>
        Array.isArray(payload.embeds) &&
        JSON.stringify(payload.embeds).includes('Delivery Incomplete')
    );

    expect(incomplete).toBeUndefined();
    expect(interaction.followUp).toHaveBeenCalledTimes(2);
  });

  it('counts the recording so /owner system metrics is not stuck at zero', async () => {
    const before = metrics.getSnapshot().voice;

    await executeRecordCommand(createRecordInteraction(async () => ({})));

    const after = metrics.getSnapshot().voice;
    expect(after.recordings).toBe(before.recordings + 1);
    expect(after.totalSeconds).toBe(before.totalSeconds + 300);
  });
});
