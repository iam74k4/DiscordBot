import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../connection.js', () => ({
  database: {
    exec: vi.fn(),
  },
}));

import { database } from '../connection.js';
import { up as preserveSteamTables } from '../migrations/005_drop_steam.js';

describe('database migrations', () => {
  const exec = vi.mocked(database.exec);

  beforeEach(() => {
    exec.mockClear();
  });

  it('preserves legacy Steam tables during the Steam removal migration', () => {
    preserveSteamTables();

    expect(exec).not.toHaveBeenCalled();
  });
});
