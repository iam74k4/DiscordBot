import { ChannelType, Collection } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connect = vi.fn();
const disconnect = vi.fn();
const getAllConnections = vi.fn(() => new Map());
const isAtLimit = vi.fn(() => false);

vi.mock('../recording/connectionManager.js', () => ({
  connectionManager: {
    connect,
    disconnect,
    getAllConnections,
    isAtLimit,
  },
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
}));

function makeMember(id: string, bot = false) {
  return {
    id,
    user: { id, bot },
  };
}

function makeVoiceChannel(
  id: string,
  name: string,
  members: ReturnType<typeof makeMember>[]
) {
  const memberCollection = new Collection<
    string,
    ReturnType<typeof makeMember>
  >();
  for (const member of members) {
    memberCollection.set(member.id, member);
  }
  return {
    id,
    name,
    type: ChannelType.GuildVoice,
    members: memberCollection,
  };
}

describe('reconcileOccupiedVoiceChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getAllConnections.mockReturnValue(new Map());
    isAtLimit.mockReturnValue(false);
    connect.mockResolvedValue({ id: 'connection' });
    disconnect.mockResolvedValue(undefined);
  });

  it('auto-joins the busiest occupied channel after restart', async () => {
    const quiet = makeVoiceChannel('ch-quiet', 'Quiet', [makeMember('u1')]);
    const busy = makeVoiceChannel('ch-busy', 'Busy', [
      makeMember('u2'),
      makeMember('u3'),
    ]);
    const empty = makeVoiceChannel('ch-empty', 'Empty', []);

    const guild = {
      id: 'guild-1',
      name: 'Guild',
      channels: {
        cache: new Collection([
          [quiet.id, quiet],
          [busy.id, busy],
          [empty.id, empty],
        ]),
      },
    };

    const client = {
      guilds: {
        cache: new Collection([[guild.id, guild]]),
      },
    } as never;

    const { reconcileOccupiedVoiceChannels } =
      await import('../application/reconcile.js');
    await reconcileOccupiedVoiceChannels(client);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect.mock.calls[0][1]).toBe(busy);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('skips guilds that already have a tracked connection', async () => {
    const occupied = makeVoiceChannel('ch-1', 'General', [makeMember('u1')]);
    const guild = {
      id: 'guild-1',
      name: 'Guild',
      channels: {
        cache: new Collection([[occupied.id, occupied]]),
      },
    };
    getAllConnections.mockReturnValue(
      new Map([
        ['other-channel', { guildId: 'guild-1', channelId: 'other-channel' }],
      ])
    );

    const client = {
      guilds: {
        cache: new Collection([[guild.id, guild]]),
      },
    } as never;

    const { reconcileOccupiedVoiceChannels } =
      await import('../application/reconcile.js');
    await reconcileOccupiedVoiceChannels(client);

    expect(connect).not.toHaveBeenCalled();
  });

  it('disconnects when the channel empties during connect', async () => {
    const occupied = makeVoiceChannel('ch-1', 'General', [makeMember('u1')]);
    connect.mockImplementation(async () => {
      occupied.members.clear();
      return { id: 'connection' };
    });

    const guild = {
      id: 'guild-1',
      name: 'Guild',
      channels: {
        cache: new Collection([[occupied.id, occupied]]),
      },
    };

    const client = {
      guilds: {
        cache: new Collection([[guild.id, guild]]),
      },
    } as never;

    const { reconcileOccupiedVoiceChannels } =
      await import('../application/reconcile.js');
    await reconcileOccupiedVoiceChannels(client);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledWith('ch-1');
  });

  it('stops when the connection limit is reached', async () => {
    isAtLimit.mockReturnValue(true);
    const occupied = makeVoiceChannel('ch-1', 'General', [makeMember('u1')]);
    const guild = {
      id: 'guild-1',
      name: 'Guild',
      channels: {
        cache: new Collection([[occupied.id, occupied]]),
      },
    };

    const client = {
      guilds: {
        cache: new Collection([[guild.id, guild]]),
      },
    } as never;

    const { reconcileOccupiedVoiceChannels } =
      await import('../application/reconcile.js');
    await reconcileOccupiedVoiceChannels(client);

    expect(connect).not.toHaveBeenCalled();
  });
});
