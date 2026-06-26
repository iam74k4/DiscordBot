import { describe, expect, it, vi } from 'vitest';

const execMock = vi.hoisted(() => vi.fn());

vi.mock('../connection.js', () => ({
  database: {
    exec: execMock,
  },
}));

describe('database migrations', () => {
  describe('005_drop_steam', () => {
    it('does not drop legacy Steam tables', async () => {
      const migration = await import('../migrations/005_drop_steam.js');

      migration.up();

      expect(execMock).not.toHaveBeenCalled();
    });
  });
});
