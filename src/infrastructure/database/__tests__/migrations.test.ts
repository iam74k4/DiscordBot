import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
}));

vi.mock('../connection.js', () => ({
  database: {
    exec: mocks.exec,
  },
}));

import { up as preserveLegacySteamTables } from '../migrations/005_drop_steam.js';

describe('database migrations', () => {
  describe('005_drop_steam', () => {
    it('does not drop legacy Steam tables during startup migrations', () => {
      preserveLegacySteamTables();

      expect(mocks.exec).not.toHaveBeenCalled();
    });
  });
});
