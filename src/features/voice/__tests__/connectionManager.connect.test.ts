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
    MAX_CONCURRENT_VC_CONNECTIONS: 2,
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

function makeChannel(id: string, guildId = 'guild-1') {
  return {
    id,
    name: `channel-${id}`,
    guild: {
      id: guildId,
      name: `guild-${guildId}`,
      voiceAdapterCreator: vi.fn(),
      members: { me: {} },
    },
    permissionsFor: vi.fn(() => ({
      has: (flag: bigint) => flag === PermissionFlagsBits.Connect,
    })),
  };
}

function makeGuild(channel: ReturnType<typeof makeChannel>) {
  return channel.guild;
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
    const guild = makeGuild(channel);

    const p1 = manager.connect(guild as never, channel as never);
    const p2 = manager.connect(guild as never, channel as never);

    const [c1, c2] = await Promise.all([p1, p2]);
    expect(c1).not.toBeNull();
    expect(c2).toBe(c1);
    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
  });

  it('enforces MAX_CONCURRENT_VC_CONNECTIONS across concurrent guild joins', async () => {
    const manager = new VoiceConnectionManager();
    // Limit is 2 in the mock; three different guilds => one refusal.
    const ch1 = makeChannel('ch-1', 'guild-a');
    const ch2 = makeChannel('ch-2', 'guild-b');
    const ch3 = makeChannel('ch-3', 'guild-c');

    const results = await Promise.all([
      manager.connect(makeGuild(ch1) as never, ch1 as never),
      manager.connect(makeGuild(ch2) as never, ch2 as never),
      manager.connect(makeGuild(ch3) as never, ch3 as never),
    ]);
    const successes = results.filter((r) => r !== null);
    expect(successes).toHaveLength(2);
    expect(joinVoiceChannel).toHaveBeenCalledTimes(2);
  });

  it('refuses a second channel in the same guild to prevent mix-ring cross-talk', async () => {
    const manager = new VoiceConnectionManager();
    const chA = makeChannel('ch-a', 'guild-shared');
    const chB = makeChannel('ch-b', 'guild-shared');

    const first = await manager.connect(makeGuild(chA) as never, chA as never);
    const second = await manager.connect(makeGuild(chB) as never, chB as never);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
    expect(manager.getConnection('ch-a')).toBeDefined();
    expect(manager.getConnection('ch-b')).toBeUndefined();
  });

  it('refuses concurrent joins to different channels in the same guild', async () => {
    const manager = new VoiceConnectionManager();
    const chA = makeChannel('ch-a2', 'guild-race');
    const chB = makeChannel('ch-b2', 'guild-race');

    const results = await Promise.all([
      manager.connect(makeGuild(chA) as never, chA as never),
      manager.connect(makeGuild(chB) as never, chB as never),
    ]);
    const successes = results.filter((r) => r !== null);
    expect(successes).toHaveLength(1);
    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
  });

  it('does not let a stale disconnect handler destroy a replacement connection', async () => {
    const manager = new VoiceConnectionManager();
    const channel = makeChannel('ch-replace');
    const guild = makeGuild(channel);

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

    await manager.connect(guild as never, channel as never);
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
    await manager.connect(guild as never, channel as never);
    expect(manager.getConnection('ch-replace')?.connection).toBe(connB);

    rejectRecovery(new Error('recovery timed out'));
    await staleCleanup;

    expect(manager.getConnection('ch-replace')?.connection).toBe(connB);
    expect(channelMixRingManager.remove).toHaveBeenCalledTimes(1);
    expect(connB.destroy).not.toHaveBeenCalled();
  });
});
