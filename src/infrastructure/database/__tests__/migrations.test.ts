import { describe, expect, it, vi } from 'vitest';

const exec = vi.fn();

vi.mock('../connection.js', () => ({
  database: {
    exec,
  },
}));

describe('database migrations', () => {
  describe('005_drop_steam', () => {
    it('preserves legacy Steam tables and data', async () => {
      const { up } = await import('../migrations/005_drop_steam.js');

      up();

      const executedSql = exec.mock.calls
        .map(([sql]) => String(sql))
        .join('\n')
        .toUpperCase();

      expect(executedSql).not.toMatch(/\bDROP\s+TABLE\b/);
      expect(executedSql).not.toMatch(/\bDELETE\s+FROM\b/);
      expect(exec).not.toHaveBeenCalled();
    });
  });
});
