import { AUDIO } from '../../../config/constants.js';
import { env } from '../../../config/index.js';

/** Discord voice decode path: 48 kHz mono int16 LE into the mix ring. */
const SAMPLE_RATE = AUDIO.SAMPLE_RATE;

/**
 * Wall-clock–aligned ring buffer: multiple users' PCM is summed per sample with
 * slot ownership to handle ring wrap. Output uses soft limiting.
 */
export class ChannelMixRing {
  private readonly sizeSamples: number;
  private readonly mix: Float32Array;
  /** Global sample index last written per slot, or -1 if empty */
  private readonly slotOwner: Int32Array;
  private epochMs: number;

  constructor(bufferDurationSeconds: number) {
    this.sizeSamples = Math.ceil(SAMPLE_RATE * bufferDurationSeconds);
    this.mix = new Float32Array(this.sizeSamples);
    this.slotOwner = new Int32Array(this.sizeSamples);
    this.slotOwner.fill(-1);
    this.epochMs = Date.now();
  }

  /**
   * Reset timeline (e.g. new VC session). Clears accumulated mix state.
   */
  setEpoch(ms: number): void {
    this.epochMs = ms;
    this.mix.fill(0);
    this.slotOwner.fill(-1);
  }

  /**
   * Mix mono s16le PCM into the ring. `endWallMs` is receive time (chunk end).
   */
  addMonoPcmInt16(pcm: Buffer, endWallMs: number): void {
    const n = pcm.length >> 1;
    if (n <= 0) return;

    const durationMs = (n / SAMPLE_RATE) * 1000;
    const startWallMs = endWallMs - durationMs;
    const startGlobal = Math.round(
      (startWallMs - this.epochMs) * (SAMPLE_RATE / 1000)
    );

    for (let j = 0; j < n; j++) {
      const g = startGlobal + j;
      if (g < 0) continue;

      const idx =
        ((g % this.sizeSamples) + this.sizeSamples) % this.sizeSamples;
      if (this.slotOwner[idx] !== g) {
        this.mix[idx] = 0;
        this.slotOwner[idx] = g;
      }

      this.mix[idx] += pcm.readInt16LE(j * 2);
    }
  }

  /**
   * Read the last `seconds` of mixed audio as s16le mono (includes silence).
   */
  extractLastSeconds(seconds: number, nowMs = Date.now()): Buffer {
    const totalSamples = Math.min(
      Math.floor(seconds * SAMPLE_RATE),
      this.sizeSamples
    );
    const endGlobal = Math.floor((nowMs - this.epochMs) * (SAMPLE_RATE / 1000));
    const startGlobal = endGlobal - totalSamples;
    const out = Buffer.allocUnsafe(totalSamples * 2);

    for (let j = 0; j < totalSamples; j++) {
      const g = startGlobal + j;
      let v = 0;
      if (g >= 0) {
        const idx =
          ((g % this.sizeSamples) + this.sizeSamples) % this.sizeSamples;
        if (this.slotOwner[idx] === g) {
          v = this.mix[idx];
        }
      }

      const soft = softLimitToInt16(v);
      out.writeInt16LE(soft, j * 2);
    }

    return out;
  }

  getApproxSizeMB(): number {
    return (this.mix.byteLength + this.slotOwner.byteLength) / (1024 * 1024);
  }
}

/**
 * Map float mix sum to int16 with gentle saturation (multi-speaker headroom).
 */
function softLimitToInt16(v: number): number {
  const t = Math.tanh(v / 24000);
  const s = Math.round(t * 32767);
  return Math.max(-32768, Math.min(32767, s));
}

/**
 * Per-channel time-aligned mix rings (one per voice channel id).
 */
export class ChannelMixRingManager {
  private readonly rings = new Map<string, ChannelMixRing>();

  /**
   * Create or return existing ring for a channel. Does not reset epoch.
   */
  getOrCreate(channelId: string): ChannelMixRing {
    let ring = this.rings.get(channelId);
    if (!ring) {
      ring = new ChannelMixRing(env.AUDIO_BUFFER_DURATION);
      this.rings.set(channelId, ring);
    }
    return ring;
  }

  remove(channelId: string): void {
    this.rings.delete(channelId);
  }

  extractLastSeconds(
    channelId: string,
    seconds: number,
    nowMs?: number
  ): Buffer {
    const ring = this.rings.get(channelId);
    if (!ring) {
      return Buffer.alloc(0);
    }
    return ring.extractLastSeconds(seconds, nowMs);
  }

  getTotalMixBufferSizeMB(): number {
    let sum = 0;
    for (const ring of this.rings.values()) {
      sum += ring.getApproxSizeMB();
    }
    return sum;
  }
}

export const channelMixRingManager = new ChannelMixRingManager();
