import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  ChannelMixRing,
  ChannelMixRingManager,
} from '../recording/channelMixRing.js';

vi.mock('../../../config/index.js', () => ({
  env: {
    AUDIO_BUFFER_DURATION: 60,
  },
}));

describe('ChannelMixRing', () => {
  const epoch = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(epoch);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sums two speakers at the same global sample', () => {
    const ring = new ChannelMixRing(10);
    ring.setEpoch(epoch);

    const frameSamples = 960;
    const pcmA = Buffer.alloc(frameSamples * 2);
    const pcmB = Buffer.alloc(frameSamples * 2);
    pcmA.writeInt16LE(3000, 0);
    pcmB.writeInt16LE(4000, 0);

    const endMs = epoch + 20;
    ring.addMonoPcmInt16(pcmA, endMs);
    ring.addMonoPcmInt16(pcmB, endMs);

    const out = ring.extractLastSeconds(0.02, endMs);
    expect(out.length).toBe(frameSamples * 2);
    expect(Math.abs(out.readInt16LE(0))).toBeGreaterThan(5000);
  });

  it('overwrites ring slot when global sample wraps past buffer length', () => {
    const ring = new ChannelMixRing(0.02);
    ring.setEpoch(epoch);
    const frameBytes = 960 * 2;
    const pcmEarly = Buffer.alloc(frameBytes);
    pcmEarly.writeInt16LE(5000, 0);
    const pcmLate = Buffer.alloc(frameBytes);
    pcmLate.writeInt16LE(7000, 0);

    const earlyEnd = epoch + 25;
    ring.addMonoPcmInt16(pcmEarly, earlyEnd);

    const lateEnd = earlyEnd + 25;
    ring.addMonoPcmInt16(pcmLate, lateEnd);

    const out = ring.extractLastSeconds(0.05, lateEnd);
    expect(out.length).toBeGreaterThan(0);
    const peak = maxAbsInt16(out);
    expect(peak).toBeGreaterThan(4000);
  });

  it('extractLastSeconds returns silence before epoch', () => {
    const ring = new ChannelMixRing(5);
    ring.setEpoch(epoch + 5000);

    const pcm = Buffer.alloc(4800);
    pcm.writeInt16LE(8000, 0);
    ring.addMonoPcmInt16(pcm, epoch + 5010);

    const out = ring.extractLastSeconds(0.1, epoch + 5020);
    const mid = out.length >> 1;
    expect(Math.abs(out.readInt16LE(mid))).toBeLessThan(100);
  });

  it('preserves audio past the Int32 sample-index range (~12.4h @ 48kHz)', () => {
    const ring = new ChannelMixRing(1);
    // Past 2^31 samples at 48 kHz ≈ 12.4 hours from epoch
    const lateEpoch = epoch;
    ring.setEpoch(lateEpoch);

    const pastInt32Ms = Math.ceil((2 ** 31 / 48_000) * 1000) + 1_000;
    const endMs = lateEpoch + pastInt32Ms;
    const pcm = Buffer.alloc(960 * 2);
    pcm.writeInt16LE(9000, 0);
    ring.addMonoPcmInt16(pcm, endMs);

    const out = ring.extractLastSeconds(0.02, endMs);
    expect(Math.abs(out.readInt16LE(0))).toBeGreaterThan(1000);
  });
});

function maxAbsInt16(buf: Buffer): number {
  let m = 0;
  for (let i = 0; i < buf.length; i += 2) {
    m = Math.max(m, Math.abs(buf.readInt16LE(i)));
  }
  return m;
}

describe('ChannelMixRingManager', () => {
  it('remove drops channel', () => {
    const mgr = new ChannelMixRingManager();
    mgr.getOrCreate('c1');
    expect(mgr.getTotalMixBufferSizeMB()).toBeGreaterThan(0);
    mgr.remove('c1');
    expect(mgr.extractLastSeconds('c1', 1).length).toBe(0);
  });
});
