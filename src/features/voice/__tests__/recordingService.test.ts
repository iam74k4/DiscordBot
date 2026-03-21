import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAudio } from '../recording/recordingService.js';

const mockGetBuffer = vi.hoisted(() => vi.fn());
vi.mock('../recording/audioBuffer.js', () => ({
  audioBufferManager: {
    getBuffer: mockGetBuffer,
  },
}));

vi.mock('fs/promises', () => ({
  stat: vi.fn(() => Promise.resolve({ size: 1024 })),
  mkdir: vi.fn(() => Promise.resolve()),
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

describe('recordingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBuffer.mockReturnValue({
      getAudioData: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    });
  });

  it('throws for duration <= 0', async () => {
    await expect(
      recordAudio({
        channelId: 'ch1',
        duration: 0,
        userId: 'u1',
        guildId: 'g1',
      })
    ).rejects.toThrow('Duration must be greater than 0');
  });

  it('throws when recording already in progress', async () => {
    mockGetBuffer.mockReturnValue({
      getAudioData: () => new Promise(() => {}),
    });

    const p1 = recordAudio({
      channelId: 'ch1',
      duration: 5,
      userId: 'u1',
      guildId: 'g1',
    });

    await expect(
      recordAudio({
        channelId: 'ch1',
        duration: 5,
        userId: 'u2',
        guildId: 'g1',
      })
    ).rejects.toThrow('Recording already in progress');

    p1.catch(() => undefined);
  });
});
