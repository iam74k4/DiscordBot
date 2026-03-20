import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectionManager } from '../services/connectionManager.js';

vi.mock('@discordjs/voice', () => ({
  joinVoiceChannel: vi.fn(),
  VoiceConnectionStatus: {},
  entersState: vi.fn((c: unknown) => Promise.resolve(c)),
  getVoiceConnection: vi.fn(() => null),
}));

describe('connectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllConnections returns a Map', () => {
    const connections = connectionManager.getAllConnections();
    expect(connections).toBeInstanceOf(Map);
  });

  it('getConnectionCount returns number', () => {
    const count = connectionManager.getConnectionCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
