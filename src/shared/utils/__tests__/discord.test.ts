import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import {
  getSendableTextChannel,
  hasPermission,
  interactionHasGuildPermission,
} from '../discord.js';

function createInteraction(
  permissions?: bigint[],
  inGuild: boolean = true
): ChatInputCommandInteraction {
  return {
    guild: inGuild ? { id: 'guild-1' } : null,
    member: inGuild
      ? { permissions: new PermissionsBitField(permissions ?? []) }
      : null,
  } as unknown as ChatInputCommandInteraction;
}

function createTextChannelMock(canSend: boolean): TextChannel {
  const channel = Object.create(TextChannel.prototype) as TextChannel;
  channel.permissionsFor = vi.fn(() =>
    canSend ? new PermissionsBitField([PermissionFlagsBits.SendMessages]) : null
  );
  return channel;
}

describe('discord utils', () => {
  it('checks permission objects safely', () => {
    expect(
      hasPermission(
        {
          permissions: new PermissionsBitField([
            PermissionFlagsBits.ManageGuild,
          ]),
        },
        PermissionFlagsBits.ManageGuild
      )
    ).toBe(true);
    expect(hasPermission({}, PermissionFlagsBits.ManageGuild)).toBe(false);
  });

  it('checks interaction guild permissions', () => {
    const allowed = createInteraction([PermissionFlagsBits.ManageGuild]);
    const denied = createInteraction([]);
    const dm = createInteraction(undefined, false);

    expect(
      interactionHasGuildPermission(allowed, PermissionFlagsBits.ManageGuild)
    ).toBe(true);
    expect(
      interactionHasGuildPermission(denied, PermissionFlagsBits.ManageGuild)
    ).toBe(false);
    expect(
      interactionHasGuildPermission(dm, PermissionFlagsBits.ManageGuild)
    ).toBe(false);
  });

  it('returns a sendable text channel when the bot can post', async () => {
    const channel = createTextChannelMock(true);
    const guild = {
      channels: {
        cache: new Map([['channel-1', channel]]),
        fetch: vi.fn(),
      },
      members: {
        me: { id: 'bot-1' },
      },
    } as never;

    const result = await getSendableTextChannel(guild, 'channel-1');

    expect(result).toBe(channel);
  });

  it('returns null when the bot cannot post to the channel', async () => {
    const channel = createTextChannelMock(false);
    const guild = {
      channels: {
        cache: new Map([['channel-1', channel]]),
        fetch: vi.fn(),
      },
      members: {
        me: { id: 'bot-1' },
      },
    } as never;

    const result = await getSendableTextChannel(guild, 'channel-1');

    expect(result).toBeNull();
  });
});
