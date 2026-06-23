import { describe, expect, it, vi } from 'vitest';

const { exec } = vi.hoisted(() => ({
  exec: vi.fn(),
}));

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

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
