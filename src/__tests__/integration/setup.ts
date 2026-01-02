import { vi } from 'vitest';
import {
  Client,
  Guild,
  GuildMember,
  TextChannel,
  VoiceChannel,
  User,
  ChatInputCommandInteraction,
  Collection,
} from 'discord.js';

/**
 * Create a mock Discord.js Client
 */
export function createMockClient(): Client {
  const client = {
    user: {
      id: '123456789012345678',
      username: 'TestBot',
      tag: 'TestBot#0000',
    },
    guilds: {
      cache: new Collection<string, Guild>(),
    },
    channels: {
      cache: new Collection<string, TextChannel | VoiceChannel>(),
    },
    ws: {
      ping: 50,
    },
    isReady: vi.fn().mockReturnValue(true),
    login: vi.fn().mockResolvedValue('token'),
    destroy: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  } as unknown as Client;

  return client;
}

/**
 * Create a mock User
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: '987654321098765432',
    username: 'TestUser',
    displayName: 'Test User',
    tag: 'TestUser#0000',
    bot: false,
    discriminator: '0000',
    avatar: null,
    ...overrides,
  } as User;
}

/**
 * Create a mock Guild
 */
export function createMockGuild(overrides: Partial<Guild> = {}): Guild {
  return {
    id: '111222333444555666',
    name: 'Test Guild',
    memberCount: 100,
    members: {
      cache: new Collection<string, GuildMember>(),
      fetch: vi.fn(),
    },
    channels: {
      cache: new Collection<string, TextChannel | VoiceChannel>(),
    },
    ...overrides,
  } as unknown as Guild;
}

/**
 * Create a mock ChatInputCommandInteraction
 */
export function createMockInteraction(
  overrides: {
    commandName?: string;
    subcommand?: string;
    options?: Record<string, unknown>;
    user?: Partial<User>;
    guild?: Partial<Guild>;
    locale?: string;
  } = {}
): ChatInputCommandInteraction {
  const user = createMockUser(overrides.user);
  const guild = createMockGuild(overrides.guild);

  const optionsData = overrides.options ?? {};

  const interaction = {
    id: '999888777666555444',
    commandName: overrides.commandName ?? 'test',
    user,
    member: {
      user,
      permissions: {
        has: vi.fn().mockReturnValue(true),
      },
    },
    guild,
    guildId: guild.id,
    channel: {
      id: '777666555444333222',
      send: vi.fn().mockResolvedValue({}),
    },
    channelId: '777666555444333222',
    locale: overrides.locale ?? 'en-US',
    client: createMockClient(),
    options: {
      getSubcommand: vi.fn().mockReturnValue(overrides.subcommand ?? null),
      getString: vi.fn((name: string) => optionsData[name] ?? null),
      getInteger: vi.fn((name: string) => optionsData[name] ?? null),
      getNumber: vi.fn((name: string) => optionsData[name] ?? null),
      getBoolean: vi.fn((name: string) => optionsData[name] ?? null),
      getUser: vi.fn((name: string) => optionsData[name] ?? null),
      getChannel: vi.fn((name: string) => optionsData[name] ?? null),
      getMember: vi.fn((name: string) => optionsData[name] ?? null),
      getRole: vi.fn((name: string) => optionsData[name] ?? null),
    },
    reply: vi.fn().mockResolvedValue({}),
    deferReply: vi.fn().mockResolvedValue({}),
    editReply: vi.fn().mockResolvedValue({}),
    followUp: vi.fn().mockResolvedValue({}),
    isCommand: vi.fn().mockReturnValue(true),
    isChatInputCommand: vi.fn().mockReturnValue(true),
    isAutocomplete: vi.fn().mockReturnValue(false),
    isButton: vi.fn().mockReturnValue(false),
  } as unknown as ChatInputCommandInteraction;

  return interaction;
}

/**
 * Mock environment variables for testing
 */
export function mockEnv(overrides: Record<string, string> = {}): void {
  const defaults = {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    STEAM_API_KEY: 'ABCDEF1234567890ABCDEF1234567890',
    BOT_OWNER_IDS: '987654321098765432',
    NODE_ENV: 'test',
  };

  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    process.env[key] = value;
  }
}

/**
 * Clear all mocks
 */
export function clearAllMocks(): void {
  vi.clearAllMocks();
}

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  vi.resetAllMocks();
}

