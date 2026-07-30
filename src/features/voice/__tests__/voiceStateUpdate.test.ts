import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';

const connect = vi.fn();
const disconnect = vi.fn();
const getConnection = vi.fn();
const isAtLimit = vi.fn();
const updateActivity = vi.fn();

vi.mock('../recording/connectionManager.js', () => ({
  connectionManager: {
    connect,
    disconnect,
    getConnection,
    isAtLimit,
    updateActivity,
    getAllConnections: vi.fn(() => new Map()),
  },
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

function voiceChannel(opts: {
  id: string;
  name?: string;
  humanIds?: string[];
}) {
  const members = new Collection<
    string,
    { user: { bot: boolean; id: string } }
  >();
  for (const id of opts.humanIds ?? []) {
    members.set(id, { user: { bot: false, id } });
  }
  members.set('bot-1', { user: { bot: true, id: 'bot-1' } });
  return {
    id: opts.id,
    name: opts.name ?? opts.id,
    members,
  };
}

describe('voiceStateUpdate critical paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAtLimit.mockReturnValue(false);
    getConnection.mockReturnValue(undefined);
    connect.mockResolvedValue({ id: 'vc' });
    disconnect.mockResolvedValue(undefined);
  });

  it('disconnects when the channel empties during connect await', async () => {
    const { event } = await import('../events/voiceStateUpdate.js');
    const channel = voiceChannel({ id: 'ch-1', humanIds: ['user-1'] });

    connect.mockImplementation(async () => {
      // Simulate leave racing the permission/connect await
      channel.members.delete('user-1');
      getConnection.mockReturnValue({ channelId: 'ch-1' });
      return { id: 'vc' };
    });

    const client = {
      isFullyReady: true,
      user: { id: 'bot-1' },
    };

    await event.execute(
      client as never,
      { channel: null, member: { user: { id: 'user-1' } } } as never,
      {
        channel,
        guild: { id: 'guild-1', name: 'G' },
        member: { user: { id: 'user-1' } },
      } as never
    );

    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledWith('ch-1');
  });

  it('cleans up tracked state when the bot is moved to another channel', async () => {
    const { event } = await import('../events/voiceStateUpdate.js');
    const oldChannel = voiceChannel({ id: 'ch-a', humanIds: [] });
    const newChannel = voiceChannel({ id: 'ch-b', humanIds: ['user-1'] });

    getConnection.mockImplementation((id: string) =>
      id === 'ch-a' ? { channelId: 'ch-a' } : undefined
    );

    const client = {
      isFullyReady: true,
      user: { id: 'bot-1' },
    };

    await event.execute(
      client as never,
      {
        channel: oldChannel,
        guild: { id: 'guild-1', name: 'G' },
        member: { user: { id: 'bot-1' } },
      } as never,
      {
        channel: newChannel,
        guild: { id: 'guild-1', name: 'G' },
        member: { user: { id: 'bot-1' } },
      } as never
    );

    expect(disconnect).toHaveBeenCalledWith('ch-a');
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'guild-1' }),
      newChannel
    );
  });

  it('cleans up when the bot is disconnected externally', async () => {
    const { event } = await import('../events/voiceStateUpdate.js');
    const oldChannel = voiceChannel({ id: 'ch-a' });

    getConnection.mockReturnValue({ channelId: 'ch-a' });

    await event.execute(
      {
        isFullyReady: true,
        user: { id: 'bot-1' },
      } as never,
      {
        channel: oldChannel,
        guild: { id: 'guild-1', name: 'G' },
        member: { user: { id: 'bot-1' } },
      } as never,
      {
        channel: null,
        guild: { id: 'guild-1', name: 'G' },
        member: { user: { id: 'bot-1' } },
      } as never
    );

    expect(disconnect).toHaveBeenCalledWith('ch-a');
    expect(connect).not.toHaveBeenCalled();
  });
});
