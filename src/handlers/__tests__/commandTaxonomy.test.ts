import { Collection } from 'discord.js';
import { describe, expect, it } from 'vitest';
import type { ExtendedClient } from '../../client.js';
import { loadCommands } from '../commandHandler.js';

describe('command taxonomy', () => {
  it('loads only unified top-level commands', async () => {
    const client = {
      commands: new Collection(),
    } as unknown as ExtendedClient;

    await loadCommands(client);
    const names = [...client.commands.keys()];

    expect(names).toEqual(
      expect.arrayContaining([
        'general',
        'notification',
        'community',
        'voice',
        'admin',
        'owner',
      ])
    );
    expect(names).not.toEqual(
      expect.arrayContaining(['poll', 'roulette', 'record', 'steam'])
    );
  });
});
