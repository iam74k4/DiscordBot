import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';
import { VoiceConnectionManager } from '../recording/connectionManager.js';

const joinVoiceChannel = vi.hoisted(() => vi.fn());

vi.mock('@discordjs/voice', () => ({
  joinVoiceChannel,
  createAudioPlayer: vi.fn(() => ({})),
  VoiceConnectionStatus: {
    Ready: 'ready',
    Disconnected: 'disconnected',
    Signalling: 'signalling',
    Connecting: 'connecting',
  },
  EndBehaviorType: { AfterSilence: 'after-silence' },
  entersState: vi.fn((c: unknown) => Promise.resolve(c)),
}));

vi.mock('prism-media', () => ({
  default: {
    opus: {
      Decoder: class {
        pipe() {
          return {
            on: vi.fn(),
            destroy: vi.fn(),
            destroyed: false,
          };
        }
      },
    },
  },
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    MAX_CONCURRENT_VC_CONNECTIONS: 1,
  },
  AUDIO: {
    SAMPLE_RATE: 48000,
  },
}));

vi.mock('../recording/channelMixRing.js', () => ({
  channelMixRingManager: {
    getOrCreate: vi.fn(() => ({ setEpoch: vi.fn() })),
    remove: vi.fn(),
  },
}));

function makeChannel(id: string) {
  return {
    id,
    name: `channel-${id}`,
    guild: {
      id: 'guild-1',
      name: 'guild',
      voiceAdapterCreator: vi.fn(),
      members: { me: {} },
    },
    permissionsFor: vi.fn(() => ({
      has: (flag: bigint) => flag === PermissionFlagsBits.Connect,
    })),
  };
}

function makeConnectionMock() {
  return {
    subscribe: vi.fn(),
    destroy: vi.fn(),
    receiver: {
      speaking: { on: vi.fn() },
      subscribe: vi.fn(),
    },
    on: vi.fn(),
  };
}

describe('VoiceConnectionManager.connect concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinVoiceChannel.mockImplementation(() => makeConnectionMock());
  });

  it('dedupes concurrent connect calls for the same channel', async () => {
    const manager = new VoiceConnectionManager();
    const channel = makeChannel('ch-same');

    const p1 = manager.connect({} as never, channel as never);
    const p2 = manager.connect({} as never, channel as never);

    const [c1, c2] = await Promise.all([p1, p2]);
    expect(c1).not.toBeNull();
    expect(c2).toBe(c1);
    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
  });

  it('enforces MAX_CONCURRENT_VC_CONNECTIONS across concurrent channel joins', async () => {
    const manager = new VoiceConnectionManager();
    const ch1 = makeChannel('ch-1');
    const ch2 = makeChannel('ch-2');

    const p1 = manager.connect({} as never, ch1 as never);
    const p2 = manager.connect({} as never, ch2 as never);

    const results = await Promise.all([p1, p2]);
    const successes = results.filter((r) => r !== null);
    expect(successes).toHaveLength(1);
    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
  });
});
