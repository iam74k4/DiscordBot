import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  ChannelMixRing,
  ChannelMixRingManager,
  resolveChunkEndWallMs,
} from '../recording/channelMixRing.js';

vi.mock('../../../config/index.js', () => ({
  env: {
    AUDIO_BUFFER_DURATION: 60,
  },
}));

describe('resolveChunkEndWallMs', () => {
  it('uses wall clock for the first chunk', () => {
    expect(resolveChunkEndWallMs(1_000, null, 20)).toBe(1_000);
  });

  it('keeps wall clock when chunks are spaced by at least durationMs', () => {
    expect(resolveChunkEndWallMs(1_020, 1_000, 20)).toBe(1_020);
    expect(resolveChunkEndWallMs(1_040, 1_020, 20)).toBe(1_040);
  });

  it('advances past the previous chunk when drained in the same millisecond', () => {
    const first = resolveChunkEndWallMs(5_000, null, 20);
    const second = resolveChunkEndWallMs(5_000, first, 20);
    const third = resolveChunkEndWallMs(5_000, second, 20);
    expect(first).toBe(5_000);
    expect(second).toBe(5_020);
    expect(third).toBe(5_040);
  });

  it('preserves a real wall-clock gap larger than one frame', () => {
    expect(resolveChunkEndWallMs(5_100, 5_000, 20)).toBe(5_100);
  });
});

describe('ChannelMixRing', () => {
  const epoch = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(epoch);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collapses same-user frames that share endWallMs onto one window', () => {
    // Documents why connectionManager must not stamp catch-up chunks with
    // identical Date.now() values: consecutive frames sum into the same slots.
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
    // Soft-limited sum of 3000+4000 — proves both frames hit the same samples.
    expect(Math.abs(out.readInt16LE(0))).toBeGreaterThan(5000);
  });

  it('keeps catch-up frames contiguous when end times advance by duration', () => {
    const ring = new ChannelMixRing(10);
    ring.setEpoch(epoch);

    const frameSamples = 960;
    const pcmA = Buffer.alloc(frameSamples * 2);
    const pcmB = Buffer.alloc(frameSamples * 2);
    pcmA.fill(0);
    pcmB.fill(0);
    pcmA.writeInt16LE(8000, 0);
    pcmB.writeInt16LE(9000, 0);

    let lastEnd: number | null = null;
    const now = epoch + 40;
    const durationMs = (frameSamples / 48000) * 1000;
    const endA = resolveChunkEndWallMs(now, lastEnd, durationMs);
    lastEnd = endA;
    const endB = resolveChunkEndWallMs(now, lastEnd, durationMs);

    ring.addMonoPcmInt16(pcmA, endA);
    ring.addMonoPcmInt16(pcmB, endB);

    const out = ring.extractLastSeconds(0.04, endB);
    const firstPeak = Math.abs(out.readInt16LE(0));
    const secondPeak = Math.abs(out.readInt16LE(frameSamples * 2));
    // Soft-limited single-frame peaks stay well below a collapsed sum (~17k → ~20k).
    expect(firstPeak).toBeGreaterThan(9000);
    expect(firstPeak).toBeLessThan(12000);
    expect(secondPeak).toBeGreaterThan(10000);
    expect(secondPeak).toBeLessThan(13000);
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
