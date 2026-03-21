import { describe, it, expect, vi } from 'vitest';
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
} from 'discord.js';
import { permissionsMiddleware } from '../permissions.js';
import { Command } from '../../shared/types/index.js';

function createMockInteraction(permissions?: bigint[], inGuild = true) {
  const bitField = permissions
    ? new PermissionsBitField(permissions)
    : new PermissionsBitField();

  return {
    guild: inGuild ? { id: 'guild-1' } : null,
    member: inGuild ? { permissions: bitField } : null,
  } as unknown as ChatInputCommandInteraction;
}

function createMockCommand(permissions?: bigint[]): Command {
  return {
    data: new SlashCommandBuilder().setName('test').setDescription('test'),
    options: permissions ? { permissions } : undefined,
    execute: vi.fn(),
  };
}

describe('permissionsMiddleware', () => {
  it('should pass when no permissions are required', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand();

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(true);
  });

  it('should pass when permissions array is empty', async () => {
    const interaction = createMockInteraction();
    const command = createMockCommand([]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(true);
  });

  it('should pass when user has required permissions', async () => {
    const interaction = createMockInteraction([
      PermissionFlagsBits.ManageGuild,
    ]);
    const command = createMockCommand([PermissionFlagsBits.ManageGuild]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(true);
  });

  it('should fail when user lacks required permissions', async () => {
    const interaction = createMockInteraction([]);
    const command = createMockCommand([PermissionFlagsBits.ManageGuild]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(false);
    expect(result.message).toContain('permissions');
  });

  it('should fail when not in a guild', async () => {
    const interaction = createMockInteraction(undefined, false);
    const command = createMockCommand([PermissionFlagsBits.ManageGuild]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(false);
    expect(result.message).toContain('server');
  });

  it('should check multiple permissions', async () => {
    const interaction = createMockInteraction([
      PermissionFlagsBits.ManageGuild,
    ]);
    const command = createMockCommand([
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.Administrator,
    ]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(false);
  });

  it('should pass when user has all required permissions', async () => {
    const interaction = createMockInteraction([
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.Administrator,
    ]);
    const command = createMockCommand([
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.Administrator,
    ]);

    const result = await permissionsMiddleware(interaction, command);
    expect(result.success).toBe(true);
  });
});
