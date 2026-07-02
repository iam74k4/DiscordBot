import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exec } = vi.hoisted(() => ({
  exec: vi.fn(),
}));

vi.mock('../connection.js', () => ({
  database: {
    exec,
  },
}));

import { up as preserveLegacySteamData } from '../migrations/005_drop_steam.js';

describe('database migrations', () => {
  beforeEach(() => {
    exec.mockClear();
  });

  it('preserves legacy Steam tables during startup migrations', () => {
    preserveLegacySteamData();

    expect(exec).not.toHaveBeenCalled();
  });
});
