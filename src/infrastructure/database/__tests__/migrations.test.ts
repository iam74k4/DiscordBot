import { beforeEach, describe, expect, it, vi } from 'vitest';

const execMock = vi.hoisted(() => vi.fn());

vi.mock('../connection.js', () => ({
  database: {
    exec: execMock,
  },
}));

import { up as preserveSteamData } from '../migrations/005_drop_steam.js';

describe('database migrations', () => {
  beforeEach(() => {
    execMock.mockClear();
  });

  it('does not drop legacy Steam tables during startup migration replay', () => {
    preserveSteamData();

    const executedSql = execMock.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');

    expect(executedSql).not.toMatch(/\bDROP\s+TABLE\b/i);
  });
});
