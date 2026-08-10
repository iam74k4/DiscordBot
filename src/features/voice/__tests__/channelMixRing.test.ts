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

  it('drops the first frame when epoch equals the chunk end wall time', () => {
    // Documents the #169 lazy-alloc pitfall: getOrCreate() used Date.now() at
    // construction, which matches endWallMs in the same tick, so every sample
    // of the first frame lands before epoch and is skipped.
    const endMs = epoch + 20;
    const ring = new ChannelMixRing(10, endMs);
    const frameSamples = 960;
    const pcm = Buffer.alloc(frameSamples * 2);
    for (let i = 0; i < frameSamples; i++) {
      pcm.writeInt16LE(8000, i * 2);
    }
    ring.addMonoPcmInt16(pcm, endMs);
    expect(maxAbsInt16(ring.extractLastSeconds(0.02, endMs))).toBe(0);
  });

  it('keeps the first frame when epoch is the chunk start wall time', () => {
    const frameSamples = 960;
    const durationMs = (frameSamples / 48000) * 1000;
    const endMs = epoch + durationMs;
    const ring = new ChannelMixRing(10, endMs - durationMs);
    const pcm = Buffer.alloc(frameSamples * 2);
    for (let i = 0; i < frameSamples; i++) {
      pcm.writeInt16LE(8000, i * 2);
    }
    ring.addMonoPcmInt16(pcm, endMs);
    expect(maxAbsInt16(ring.extractLastSeconds(0.02, endMs))).toBeGreaterThan(
      4000
    );
  });

  it('keeps catch-up frames contiguous when end times advance by duration', () => {
    const ring = new ChannelMixRing(10, epoch);

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
    const ring = new ChannelMixRing(10, epoch);

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
    const ring = new ChannelMixRing(0.02, epoch);
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

  it('does not replay a slot written a full lap earlier', () => {
    // One lap is 20ms of samples. Audio written in lap 0 must not be read
    // back as if it belonged to lap 1 at the same ring offset.
    const ring = new ChannelMixRing(0.02, epoch);

    const pcm = Buffer.alloc(960 * 2);
    pcm.fill(0);
    for (let i = 0; i < 960; i++) {
      pcm.writeInt16LE(9000, i * 2);
    }
    ring.addMonoPcmInt16(pcm, epoch + 20);

    // Read the same ring offsets one lap later, with nothing written since.
    const out = ring.extractLastSeconds(0.02, epoch + 40);
    expect(maxAbsInt16(out)).toBe(0);
  });

  it('keeps mixing correctly after more laps than the generation counter holds', () => {
    const ring = new ChannelMixRing(0.02, epoch);

    // 0xffff laps returns the generation marker to its starting value; the
    // slot must still be recognised as belonging to the current lap.
    const lapMs = 20;
    const wrapAroundMs = epoch + lapMs * 0x10000;

    const pcm = Buffer.alloc(960 * 2);
    for (let i = 0; i < 960; i++) {
      pcm.writeInt16LE(6000, i * 2);
    }
    ring.addMonoPcmInt16(pcm, wrapAroundMs);

    const out = ring.extractLastSeconds(0.02, wrapAroundMs);
    expect(maxAbsInt16(out)).toBeGreaterThan(4000);
  });

  it('extractLastSeconds returns silence before epoch', () => {
    const ring = new ChannelMixRing(5, epoch + 5000);

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

  it('costs nothing for a channel that never receives audio', () => {
    const mgr = new ChannelMixRingManager();
    // Reading from an untouched channel must not allocate its ring; that is
    // what makes an idle voice connection free.
    expect(mgr.extractLastSeconds('quiet', 1).length).toBe(0);
    expect(mgr.getTotalMixBufferSizeMB()).toBe(0);
  });

  it('allocates the ring epoch from the first chunk start, not its end', () => {
    const mgr = new ChannelMixRingManager();
    const frameSamples = 960;
    const durationMs = (frameSamples / 48000) * 1000;
    const endMs = 1_000_000;
    const pcm = Buffer.alloc(frameSamples * 2);
    for (let i = 0; i < frameSamples; i++) {
      pcm.writeInt16LE(8000, i * 2);
    }

    mgr.getOrCreate('ch', endMs - durationMs).addMonoPcmInt16(pcm, endMs);

    expect(
      maxAbsInt16(mgr.extractLastSeconds('ch', 0.02, endMs))
    ).toBeGreaterThan(4000);
  });
});
