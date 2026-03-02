import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/cooldown/index.js', () => {
  let cooldowns: Map<string, number> = new Map();
  return {
    cooldownStore: {
      getRemainingCooldown: vi.fn((cmd: string, uid: string) => {
        const key = `${cmd}:${uid}`;
        const expiry = cooldowns.get(key);
        if (!expiry) return 0;
        return Math.max(0, expiry - Date.now());
      }),
      setCooldown: vi.fn((cmd: string, uid: string, ms: number) => {
        cooldowns.set(`${cmd}:${uid}`, Date.now() + ms);
      }),
      clearCooldown: vi.fn((cmd: string, uid: string) => {
        cooldowns.delete(`${cmd}:${uid}`);
      }),
      clearCommandCooldowns: vi.fn((cmd: string) => {
        for (const key of cooldowns.keys()) {
          if (key.startsWith(`${cmd}:`)) cooldowns.delete(key);
        }
      }),
      _reset: () => {
        cooldowns = new Map();
      },
    },
  };
});

import {
  cooldownMiddleware,
  clearCooldown,
  clearCommandCooldowns,
} from '../../middleware/cooldown.js';
import { cooldownStore } from '../../services/cooldown/index.js';
import { Command } from '../../types/index.js';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

function createMockInteraction(userId = 'user-123') {
  return {
    user: { id: userId },
  } as unknown as ChatInputCommandInteraction;
}

function createMockCommand(name: string, cooldown?: number): Command {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription('test'),
    middleware: ['cooldown'],
    options: cooldown !== undefined ? { cooldown } : undefined,
    execute: vi.fn(),
  };
}

describe('cooldownMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cooldownStore.getRemainingCooldown).mockReturnValue(0);
  });

  it('should pass when no cooldown is active', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand('test', 5000);

    const result = await cooldownMiddleware(interaction, command);

    expect(result.success).toBe(true);
    expect(cooldownStore.setCooldown).toHaveBeenCalledWith(
      'test',
      'user-123',
      5000
    );
  });

  it('should block when user is on cooldown', async () => {
    vi.mocked(cooldownStore.getRemainingCooldown).mockReturnValue(3000);

    const interaction = createMockInteraction();
    const command = createMockCommand('test', 5000);

    const result = await cooldownMiddleware(interaction, command);

    expect(result.success).toBe(false);
    expect(result.message).toContain('3.0 seconds');
  });

  it('should skip when cooldown is 0', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand('test', 0);

    const result = await cooldownMiddleware(interaction, command);

    expect(result.success).toBe(true);
    expect(cooldownStore.setCooldown).not.toHaveBeenCalled();
  });

  it('should skip when cooldown is negative', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand('test', -1);

    const result = await cooldownMiddleware(interaction, command);

    expect(result.success).toBe(true);
  });

  it('should use default cooldown when not specified', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand('test');

    const result = await cooldownMiddleware(interaction, command);

    expect(result.success).toBe(true);
    expect(cooldownStore.setCooldown).toHaveBeenCalled();
  });
});

describe('clearCooldown', () => {
  it('should call cooldownStore.clearCooldown', () => {
    clearCooldown('test', 'user-123');
    expect(cooldownStore.clearCooldown).toHaveBeenCalledWith(
      'test',
      'user-123'
    );
  });
});

describe('clearCommandCooldowns', () => {
  it('should call cooldownStore.clearCommandCooldowns', () => {
    clearCommandCooldowns('test');
    expect(cooldownStore.clearCommandCooldowns).toHaveBeenCalledWith('test');
  });
});
