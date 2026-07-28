import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';
import { VoiceConnectionManager } from '../recording/connectionManager.js';
import { channelMixRingManager } from '../recording/channelMixRing.js';

const joinVoiceChannel = vi.hoisted(() => vi.fn());
const entersState = vi.hoisted(() => vi.fn((c: unknown) => Promise.resolve(c)));

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
  entersState,
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

  it('does not let a stale disconnect handler destroy a replacement connection', async () => {
    const manager = new VoiceConnectionManager();
    const channel = makeChannel('ch-replace');

    const connA = makeConnectionMock();
    const connB = makeConnectionMock();
    joinVoiceChannel
      .mockImplementationOnce(() => connA)
      .mockImplementationOnce(() => connB);

    // Keep the first disconnect handler parked in recovery until we reconnect.
    let rejectRecovery!: (reason?: unknown) => void;
    entersState.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRecovery = reject;
        })
    );

    await manager.connect({} as never, channel as never);
    expect(manager.getConnection('ch-replace')?.connection).toBe(connA);

    const disconnectedHandler = connA.on.mock.calls.find(
      (call) => call[0] === 'disconnected'
    )?.[1] as (() => Promise<void>) | undefined;
    expect(disconnectedHandler).toBeTypeOf('function');

    const staleCleanup = disconnectedHandler!();
    await manager.disconnect('ch-replace');
    expect(manager.getConnection('ch-replace')).toBeUndefined();

    // Allow a new join while the old handler is still awaiting recovery.
    entersState.mockImplementation((c: unknown) => Promise.resolve(c));
    await manager.connect({} as never, channel as never);
    expect(manager.getConnection('ch-replace')?.connection).toBe(connB);

    rejectRecovery(new Error('recovery timed out'));
    await staleCleanup;

    expect(manager.getConnection('ch-replace')?.connection).toBe(connB);
    expect(channelMixRingManager.remove).toHaveBeenCalledTimes(1);
    expect(connB.destroy).not.toHaveBeenCalled();
  });
});
