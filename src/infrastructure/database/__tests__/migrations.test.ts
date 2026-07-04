import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exec } = vi.hoisted(() => ({
  exec: vi.fn(),
}));

vi.mock('../connection.js', () => ({
  database: {
    exec,
  },
}));

describe('database migrations', () => {
  beforeEach(() => {
    exec.mockClear();
  });

  it('keeps legacy Steam tables after feature removal', async () => {
    const migration = await import('../migrations/005_drop_steam.js');

    migration.up();

    expect(exec).not.toHaveBeenCalled();
  });
});
