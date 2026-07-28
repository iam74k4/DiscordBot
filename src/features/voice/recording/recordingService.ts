import { randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import { stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { env, AUDIO, DISCORD_LIMITS } from '../../../config/index.js';
import { channelMixRingManager } from './channelMixRing.js';
import {
  RecordingOptions,
  RecordingResult,
} from '../../../shared/types/voice.js';

/**
 * Recording queue per channel.
 * Entries are removed as soon as the recording completes.
 */
const recordingQueues = new Map<string, Promise<RecordingResult>>();

/**
 * Create WAV file header
 */
function createWAVHeader(dataSize: number): Buffer {
  const sampleRate = AUDIO.SAMPLE_RATE;
  const bitDepth = AUDIO.BIT_DEPTH;
  const channels = AUDIO.CHANNELS;
  const byteRate = (sampleRate * bitDepth * channels) / 8;
  const blockAlign = (bitDepth * channels) / 8;

  const header = Buffer.allocUnsafe(44);
  let offset = 0;

  // RIFF header
  header.write('RIFF', offset);
  offset += 4;
  header.writeUInt32LE(36 + dataSize, offset);
  offset += 4;
  header.write('WAVE', offset);
  offset += 4;

  // fmt chunk
  header.write('fmt ', offset);
  offset += 4;
  header.writeUInt32LE(16, offset); // fmt chunk size
  offset += 4;
  header.writeUInt16LE(1, offset); // audio format (PCM)
  offset += 2;
  header.writeUInt16LE(channels, offset);
  offset += 2;
  header.writeUInt32LE(sampleRate, offset);
  offset += 4;
  header.writeUInt32LE(byteRate, offset);
  offset += 4;
  header.writeUInt16LE(blockAlign, offset);
  offset += 2;
  header.writeUInt16LE(bitDepth, offset);
  offset += 2;

  // data chunk
  header.write('data', offset);
  offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return header;
}

/**
 * Thrown when the mix window has no samples above the noise threshold.
 */
export class RecordingNoAudibleAudioError extends Error {
  override readonly name = 'RecordingNoAudibleAudioError';

  constructor() {
    super(
      'No audible audio in the recording window. Make sure someone is speaking in the voice channel.'
    );
  }
}

/**
 * True if buffer has any sample above a small noise threshold.
 */
export function pcmBufferHasAudibleSignal(
  buf: Buffer,
  threshold = 48
): boolean {
  for (let i = 0; i < buf.length; i += 2) {
    if (Math.abs(buf.readInt16LE(i)) > threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Split audio file if it exceeds size limit
 */
function shouldSplitFile(fileSize: number): boolean {
  const maxSize = DISCORD_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024; // Convert MB to bytes
  return fileSize > maxSize;
}

/**
 * Split audio buffer into multiple parts
 */
function splitAudioBuffer(buffer: Buffer, maxSize: number): Buffer[] {
  const parts: Buffer[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const partSize = Math.min(maxSize, buffer.length - offset);
    const part = buffer.subarray(offset, offset + partSize);
    parts.push(part);
    offset += partSize;
  }

  return parts;
}

/**
 * Generate a unique file name for a recording.
 * Includes channel id + nonce so concurrent recordings on different
 * channels in the same second cannot overwrite each other.
 */
export function generateFileName(duration: number, channelId: string): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').replace(/\./g, '-');
  const durationStr = `${duration}s`;
  const safeChannelId = channelId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  const nonce = randomBytes(4).toString('hex');
  return `recording_${dateStr}_${durationStr}_${safeChannelId}_${nonce}.wav`;
}

/**
 * Write a WAV file (header + PCM data) to the given path.
 */
async function writeWavFile(filePath: string, pcmData: Buffer): Promise<void> {
  const header = createWAVHeader(pcmData.length);
  const fileStream = createWriteStream(filePath);

  return new Promise<void>((resolve, reject) => {
    fileStream.on('error', (error) => {
      fileStream.destroy();
      reject(error);
    });
    fileStream.write(header, (error) => {
      if (error) {
        fileStream.destroy();
        reject(error);
        return;
      }
      fileStream.write(pcmData, (error) => {
        if (error) {
          fileStream.destroy();
          reject(error);
          return;
        }
        fileStream.end(resolve);
      });
    });
  });
}

/**
 * Record audio from the channel time-aligned mix ring.
 */
export async function recordAudio(
  options: RecordingOptions
): Promise<RecordingResult> {
  const { channelId, duration } = options;

  if (recordingQueues.has(channelId)) {
    throw new Error('Recording already in progress for this channel');
  }

  if (duration <= 0) {
    throw new Error('Duration must be greater than 0');
  }

  if (duration > env.MAX_RECORDING_DURATION) {
    throw new Error(
      `Duration exceeds maximum (${env.MAX_RECORDING_DURATION}s)`
    );
  }

  if (duration > env.AUDIO_BUFFER_DURATION) {
    throw new Error(
      `Duration exceeds buffer duration (${env.AUDIO_BUFFER_DURATION}s)`
    );
  }

  // Defer work so the queue entry is registered before any sync throw
  // (e.g. RecordingNoAudibleAudioError). Otherwise finally runs before
  // set() and the rejected promise stays forever, blocking the channel.
  const recordingPromise = Promise.resolve().then(async () => {
    try {
      const audioData = channelMixRingManager.extractLastSeconds(
        channelId,
        duration
      );

      if (audioData.length === 0 || !pcmBufferHasAudibleSignal(audioData)) {
        throw new RecordingNoAudibleAudioError();
      }

      const recordingsDir = join(process.cwd(), env.RECORDINGS_DIR);
      await mkdir(recordingsDir, { recursive: true });

      const estimatedSize = audioData.length + 44;
      const maxSize = DISCORD_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;

      if (shouldSplitFile(estimatedSize)) {
        const splitSize = Math.floor(maxSize * 0.9);
        const parts = splitAudioBuffer(audioData, splitSize);
        const filePaths: string[] = [];

        for (let i = 0; i < parts.length; i++) {
          const fileName = generateFileName(duration, channelId).replace(
            '.wav',
            `_part${i + 1}.wav`
          );
          const filePath = join(recordingsDir, fileName);
          await writeWavFile(filePath, parts[i]);
          filePaths.push(filePath);
        }

        const firstFileStats = await stat(filePaths[0]);
        return {
          filePath: filePaths[0],
          fileSize: firstFileStats.size,
          duration,
          isSplit: true,
          additionalFiles: filePaths.slice(1),
        };
      } else {
        const fileName = generateFileName(duration, channelId);
        const filePath = join(recordingsDir, fileName);
        await writeWavFile(filePath, audioData);

        const fileStats = await stat(filePath);

        return {
          filePath,
          fileSize: fileStats.size,
          duration,
          isSplit: false,
        };
      }
    } finally {
      if (recordingQueues.get(channelId) === recordingPromise) {
        recordingQueues.delete(channelId);
      }
    }
  });

  recordingQueues.set(channelId, recordingPromise);

  return recordingPromise;
}

/**
 * Parse a human-readable duration string (e.g. "30s", "1m", "5m") to seconds.
 */
export function parseDurationString(durationStr: string): number {
  const match = durationStr.match(/^(\d+)([smh])$/i);
  if (!match) {
    throw new Error('Invalid duration format');
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    default:
      throw new Error('Invalid duration unit');
  }
}
