import { vi } from 'vitest';

const exec = vi.fn();

vi.mock('../connection.js', () => ({
  database: {
    exec,
  },
}));

describe('database migrations', () => {
  beforeEach(() => {
    exec.mockClear();
  });

  describe('005_drop_steam', () => {
    it('preserves legacy Steam tables during startup migrations', async () => {
      const migration = await import('../migrations/005_drop_steam.js');

      migration.up();

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
