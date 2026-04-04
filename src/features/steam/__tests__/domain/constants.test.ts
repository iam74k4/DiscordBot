import { describe, it, expect } from 'vitest';
import { STEAM_STATUS } from '../../domain/constants.js';

describe('STEAM_STATUS', () => {
  it('should have all status indicators', () => {
    expect(STEAM_STATUS.ONLINE).toBeDefined();
    expect(STEAM_STATUS.OFFLINE).toBeDefined();
    expect(STEAM_STATUS.AWAY).toBeDefined();
    expect(STEAM_STATUS.BUSY).toBeDefined();
    expect(STEAM_STATUS.INGAME).toBeDefined();
    expect(STEAM_STATUS.PRIVATE).toBeDefined();
    expect(STEAM_STATUS.PUBLIC).toBeDefined();
  });
});
