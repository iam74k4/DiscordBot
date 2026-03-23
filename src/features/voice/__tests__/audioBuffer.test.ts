import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HybridAudioBuffer } from '../recording/audioBuffer.js';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(() => Promise.resolve()),
}));

vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => ({
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn((event: string, fn: () => void) => {
      if (event === 'finish') setImmediate(fn);
      return { on: vi.fn() };
    }),
  })),
}));

const config = {
  memoryBufferDuration: 10,
  diskBufferDuration: 90,
  totalBufferDuration: 100,
  sampleRate: 48000,
  bitDepth: 16,
  channels: 1,
  diskBufferDir: '/tmp/test-buffers',
};

describe('HybridAudioBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores chunks in memory when under duration', async () => {
    const buffer = new HybridAudioBuffer('test-channel', config);
    const bytesPerSecond = 96000;
    const chunkDurationMs = 1000;

    for (let i = 0; i < 5; i++) {
      buffer.addChunk(Buffer.alloc(bytesPerSecond), chunkDurationMs);
    }

    const data = await buffer.getAudioData(5);
    expect(data.length).toBe(5 * bytesPerSecond);
  });

  it('clear removes all data', async () => {
    const buffer = new HybridAudioBuffer('test-channel', config);
    const bytesPerSecond = 96000;

    buffer.addChunk(Buffer.alloc(bytesPerSecond), 1000);
    buffer.clear();

    const data = await buffer.getAudioData(1);
    expect(data.length).toBe(0);
  });

  it('getStats returns correct structure', async () => {
    const buffer = new HybridAudioBuffer('test-channel', config);
    buffer.addChunk(Buffer.alloc(96000), 1000);

    const stats = await buffer.getStats();
    expect(stats).toHaveProperty('memoryChunks');
    expect(stats).toHaveProperty('memorySizeMB');
    expect(stats).toHaveProperty('diskFiles');
    expect(stats).toHaveProperty('diskSizeMB');
  });
});
