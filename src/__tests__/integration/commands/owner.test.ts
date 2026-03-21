import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageFlags } from 'discord.js';
import { createMockInteraction } from '../setup.js';

vi.mock('../../../infrastructure/database/connection.js', () => ({
  database: {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({ count: 5 }),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn().mockReturnValue({ changes: 0 }),
    }),
  },
}));

vi.mock('../../../infrastructure/health/index.js', () => ({
  getHealthStatus: vi.fn().mockReturnValue({
    status: 'healthy',
    uptime: 3600,
    memory: { used: 100, total: 200, percentage: 50 },
    database: { connected: true, tables: 5 },
    discord: { connected: true, ping: 50 },
    services: { scheduler: true, notifications: true, memoryMonitor: true },
    timestamp: Date.now(),
  }),
  formatHealthStatus: vi.fn().mockReturnValue('Health status formatted'),
}));

vi.mock('../../../infrastructure/backup/index.js', () => ({
  backupService: {
    runBackup: vi.fn().mockResolvedValue({
      success: true,
      filename: 'backup-2024-01-01T00-00-00.db',
      size: 1024,
      timestamp: new Date(),
    }),
    listBackups: vi.fn().mockReturnValue([]),
    formatBackupList: vi.fn().mockReturnValue('No backups found.'),
  },
}));

vi.mock('../../../infrastructure/metrics/index.js', () => ({
  metrics: {
    formatForDisplay: vi.fn().mockReturnValue('Metrics formatted'),
    getSnapshot: vi.fn().mockReturnValue({
      commands: { executed: 100, errors: 5, byName: {} },
      api: { steamCalls: 50, steamErrors: 2 },
      voice: { recordings: 10, totalSeconds: 600 },
      startTime: Date.now() - 3600000,
      uptimeSeconds: 3600,
    }),
  },
}));

vi.mock('../../../config/env.js', () => ({
  isBotOwner: vi.fn((id: string) => id === '987654321098765432'),
}));

describe('Owner Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Check', () => {
    it('should reject non-owner users', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'system',
        subcommand: 'stats',
        user: { id: 'not-owner-id' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should allow bot owner', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'system',
        subcommand: 'stats',
        user: { id: '987654321098765432' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalled();
    });
  });

  describe('Health Subcommand', () => {
    it('should display health status', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'system',
        subcommand: 'health',
        user: { id: '987654321098765432' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'System Health Check',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Backup Subcommands', () => {
    it('should list backups', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'backup',
        subcommand: 'list',
        user: { id: '987654321098765432' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Database Backups',
              }),
            }),
          ]),
        })
      );
    });

    it('should run manual backup', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'backup',
        subcommand: 'run',
        user: { id: '987654321098765432' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Backup Complete',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Metrics Subcommand', () => {
    it('should display metrics', async () => {
      const interaction = createMockInteraction({
        commandName: 'owner',
        subcommandGroup: 'system',
        subcommand: 'metrics',
        user: { id: '987654321098765432' },
      });

      const { command } =
        await import('../../../features/admin/commands/owner.js');
      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Bot Metrics',
              }),
            }),
          ]),
        })
      );
    });
  });
});
