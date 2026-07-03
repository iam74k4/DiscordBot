import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exec } = vi.hoisted(() => ({
  exec: vi.fn(),
}));

vi.mock('../connection.js', () => ({
  database: {
    exec,
  },
}));

import { up as preserveLegacySteamTables } from '../migrations/005_drop_steam.js';

describe('database migrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves legacy Steam data tables after Steam feature removal', () => {
    preserveLegacySteamTables();

    expect(exec).not.toHaveBeenCalled();
  });
});
