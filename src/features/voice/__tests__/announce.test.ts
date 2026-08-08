import { PermissionFlagsBits } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

vi.mock('../../../locales/guildLocale.js', () => ({
  resolveGuildLocale: () => 'en',
}));

vi.mock('../../../config/index.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../config/index.js')
  >('../../../config/index.js');
  return { ...actual, env: { ...actual.env, AUDIO_BUFFER_DURATION: 300 } };
});

const { announceBuffering, forgetAnnouncement } =
  await import('../application/announce.js');

function channelStub(
  options: { canSend?: boolean; send?: ReturnType<typeof vi.fn> } = {},
  id = 'voice-1'
) {
  const canSend = options.canSend ?? true;
  return {
    id,
    guild: {
      id: 'guild-1',
      preferredLocale: 'en-US',
      members: { me: { id: 'bot-1' } },
    },
    permissionsFor: vi.fn().mockReturnValue({
      has: (flag: bigint) =>
        canSend ||
        (flag !== PermissionFlagsBits.SendMessages &&
          flag !== PermissionFlagsBits.ViewChannel),
    }),
    isTextBased: () => true,
    send: options.send ?? vi.fn().mockResolvedValue({}),
  };
}

describe('announceBuffering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    forgetAnnouncement('voice-1');
  });

  it('posts the buffer window into the voice channel chat', async () => {
    const send = vi.fn().mockResolvedValue({});
    await announceBuffering(channelStub({ send }) as never);

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0] as {
      embeds: Array<{ data: { description?: string } }>;
    };
    const description = payload.embeds[0].data.description ?? '';
    expect(description).toContain('5 minutes');
    expect(description).toContain('/voice autojoin exclude');
  });

  it('announces once per stay, not on every event', async () => {
    const send = vi.fn().mockResolvedValue({});
    const channel = channelStub({ send });

    await announceBuffering(channel as never);
    await announceBuffering(channel as never);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('announces again after the bot leaves and returns', async () => {
    const send = vi.fn().mockResolvedValue({});
    const channel = channelStub({ send });

    await announceBuffering(channel as never);
    forgetAnnouncement('voice-1');
    await announceBuffering(channel as never);

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when it cannot post in the channel', async () => {
    const send = vi.fn().mockResolvedValue({});
    await announceBuffering(channelStub({ canSend: false, send }) as never);

    expect(send).not.toHaveBeenCalled();
  });

  it('never throws back into the voice connection path', async () => {
    const send = vi.fn().mockRejectedValue(new Error('rate limited'));

    await expect(
      announceBuffering(channelStub({ send }) as never)
    ).resolves.toBeUndefined();
  });
});
