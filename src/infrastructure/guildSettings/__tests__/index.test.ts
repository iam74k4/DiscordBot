import { beforeEach, describe, expect, it, vi } from 'vitest';

const prepare = vi.hoisted(() => vi.fn());

vi.mock('../../database/connection.js', () => ({
  database: { prepare },
}));

vi.mock('../../../shared/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getErrorMessage: (e: unknown) => String(e),
}));

const { guildSettingsRepository } = await import('../index.js');

interface Statement {
  sql: string;
  get: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
}

let statements: Statement[];

/** Make every prepare() return a stub, with SELECT answering `row`. */
function stubDatabase(row: Record<string, unknown> | undefined) {
  statements = [];
  prepare.mockImplementation((sql: string) => {
    const statement: Statement = {
      sql,
      get: vi.fn().mockReturnValue(row),
      run: vi.fn(),
    };
    statements.push(statement);
    return statement;
  });
}

function writeStatement() {
  return statements.find(
    (s) => s.sql.includes('UPDATE') || s.sql.includes('INSERT')
  );
}

const existingRow = {
  guild_id: 'g1',
  language: 'ja',
  audit_channel_id: 'chan-1',
  voice_autojoin_enabled: 1,
  created_at: 1,
  updated_at: 1,
};

describe('guildSettingsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('update', () => {
    it('inserts a new row with defaults for fields the caller omitted', () => {
      stubDatabase(undefined);

      guildSettingsRepository.setAuditChannel('g1', 'chan-1');

      const insert = writeStatement();
      expect(insert?.sql).toContain('INSERT INTO guild_settings');
      // Auto-join defaults to on, and language stays NULL so configuring an
      // audit channel never pins the guild to a language it did not choose.
      expect(insert?.run).toHaveBeenCalledWith(
        'g1',
        null, // language
        'chan-1', // audit_channel_id
        null, // announcement_channel_id
        1, // voice_autojoin_enabled
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('updates only the columns supplied', () => {
      stubDatabase(existingRow);

      guildSettingsRepository.setLanguage('g1', 'en');

      const update = writeStatement();
      expect(update?.sql).toContain('UPDATE guild_settings SET language = ?');
      expect(update?.sql).not.toContain('audit_channel_id');
      expect(update?.run).toHaveBeenCalledWith('en', expect.any(Number), 'g1');
    });

    it('writes nothing when an update supplies no columns', () => {
      stubDatabase(existingRow);

      guildSettingsRepository.update('g1', {});

      expect(writeStatement()).toBeUndefined();
    });

    it('stores the voice auto-join flag as an integer', () => {
      stubDatabase(existingRow);

      guildSettingsRepository.setVoiceAutoJoinEnabled('g1', false);

      expect(writeStatement()?.run).toHaveBeenCalledWith(
        0,
        expect.any(Number),
        'g1'
      );
    });
  });

  describe('reads', () => {
    it('returns the stored language', () => {
      stubDatabase(existingRow);
      expect(guildSettingsRepository.getLanguage('g1')).toBe('ja');
    });

    it('treats a missing row as "follow the viewer"', () => {
      stubDatabase(undefined);
      expect(guildSettingsRepository.getLanguage('g1')).toBeNull();
    });

    it('degrades to "follow the viewer" when the database fails', () => {
      prepare.mockImplementation(() => {
        throw new Error('no such table: guild_settings');
      });
      expect(guildSettingsRepository.getLanguage('g1')).toBeNull();
    });

    it('defaults voice auto-join to enabled for an unconfigured guild', () => {
      stubDatabase(undefined);
      expect(guildSettingsRepository.isVoiceAutoJoinEnabled('g1')).toBe(true);
    });

    it('keeps voice auto-join enabled when the database fails', () => {
      prepare.mockImplementation(() => {
        throw new Error('database is locked');
      });
      // Failing closed here would silently stop recording for every guild.
      expect(guildSettingsRepository.isVoiceAutoJoinEnabled('g1')).toBe(true);
    });

    it('reports the opt-out once it is stored', () => {
      stubDatabase({ ...existingRow, voice_autojoin_enabled: 0 });
      expect(guildSettingsRepository.isVoiceAutoJoinEnabled('g1')).toBe(false);
    });
  });
});
