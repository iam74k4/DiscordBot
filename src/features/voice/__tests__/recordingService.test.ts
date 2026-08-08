import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdir } from 'fs/promises';
import {
  recordAudio,
  generateFileName,
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
    vi.mocked(mkdir).mockImplementation(() => Promise.resolve(undefined));
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
    const audible = Buffer.alloc(4);
    audible.writeInt16LE(1000, 0);
    mockExtractLastSeconds.mockReturnValue(audible);
    vi.mocked(mkdir).mockImplementation(() => new Promise(() => {}));

    const p1 = recordAudio({
      channelId: 'ch1',
      duration: 5,
      userId: 'u1',
      guildId: 'g1',
    });

    // Allow the deferred recording work to start and park on mkdir.
    await Promise.resolve();
    await Promise.resolve();

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

  it('clears the queue after a silent-window failure so retries can proceed', async () => {
    const silent = Buffer.alloc(96000);
    mockExtractLastSeconds.mockReturnValue(silent);

    await expect(
      recordAudio({
        channelId: 'ch-retry',
        duration: 1,
        userId: 'u1',
        guildId: 'g1',
      })
    ).rejects.toBeInstanceOf(RecordingNoAudibleAudioError);

    // A second call must not report "already in progress" after the sync throw.
    await expect(
      recordAudio({
        channelId: 'ch-retry',
        duration: 1,
        userId: 'u1',
        guildId: 'g1',
      })
    ).rejects.toBeInstanceOf(RecordingNoAudibleAudioError);
  });

  it('generateFileName is unique across channels in the same second', () => {
    const a = generateFileName(30, 'channel-a');
    const b = generateFileName(30, 'channel-b');
    expect(a).not.toBe(b);
    expect(a).toContain('channel-a');
    expect(b).toContain('channel-b');
  });
});
