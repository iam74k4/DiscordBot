import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordAudio,
  pcmBufferHasAudibleSignal,
  RecordingNoAudibleAudioError,
} from '../recording/recordingService.js';

const mockExtractLastSeconds = vi.hoisted(() => vi.fn());
vi.mock('../recording/channelMixRing.js', () => ({
  channelMixRingManager: {
    extractLastSeconds: mockExtractLastSeconds,
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
    mockExtractLastSeconds.mockReturnValue(Buffer.alloc(0));
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
    mockExtractLastSeconds.mockImplementation(
      () => new Promise<Buffer>(() => {})
    );

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

  it('pcmBufferHasAudibleSignal respects threshold', () => {
    const quiet = Buffer.alloc(4);
    quiet.writeInt16LE(10, 0);
    expect(pcmBufferHasAudibleSignal(quiet, 48)).toBe(false);
    quiet.writeInt16LE(100, 0);
    expect(pcmBufferHasAudibleSignal(quiet, 48)).toBe(true);
  });

  it('throws RecordingNoAudibleAudioError when mix output is silent', async () => {
    const silent = Buffer.alloc(96000);
    mockExtractLastSeconds.mockReturnValue(silent);

    await expect(
      recordAudio({
        channelId: 'ch-silent',
        duration: 1,
        userId: 'u1',
        guildId: 'g1',
      })
    ).rejects.toBeInstanceOf(RecordingNoAudibleAudioError);
  });
});
