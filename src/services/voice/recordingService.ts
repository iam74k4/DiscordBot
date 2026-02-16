import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { env, AUDIO, DISCORD_LIMITS } from '../../config/index.js';
import { audioBufferManager } from './audioBuffer.js';
import { RecordingOptions, RecordingResult } from '../../types/voice.js';
import { BoundedMap } from '../../utils/lruCache.js';

// Maximum concurrent recordings to prevent resource exhaustion
const MAX_CONCURRENT_RECORDINGS = 100;

/**
 * Recording queue per channel (using BoundedMap to prevent memory issues)
 * Note: Entries are automatically deleted after recording completes
 */
const recordingQueues = new BoundedMap<string, Promise<RecordingResult>>(
  MAX_CONCURRENT_RECORDINGS
);

/**
 * Format duration string to seconds
 */
function parseDuration(durationStr: string): number {
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
 * Resample audio data from 48kHz to 32kHz using linear interpolation
 */
function resampleAudio(
  inputBuffer: Buffer,
  inputSampleRate: number,
  outputSampleRate: number
): Buffer {
  const inputLength = inputBuffer.length / 2; // 16-bit samples
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(inputLength / ratio);
  const output = Buffer.allocUnsafe(outputLength * 2);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputLength - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    const sample1 = inputBuffer.readInt16LE(srcIndexFloor * 2);
    const sample2 = inputBuffer.readInt16LE(srcIndexCeil * 2);
    const interpolated = Math.round(sample1 + (sample2 - sample1) * fraction);

    output.writeInt16LE(interpolated, i * 2);
  }

  return output;
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
 * Generate file name for recording
 */
function generateFileName(duration: number): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  const durationStr = `${duration}s`;
  return `recording_${dateStr}_${durationStr}.wav`;
}

/**
 * Record audio from buffer
 */
export async function recordAudio(
  options: RecordingOptions
): Promise<RecordingResult> {
  const { channelId, duration } = options;

  // Check if recording is already in progress for this channel
  if (recordingQueues.has(channelId)) {
    throw new Error('Recording already in progress for this channel');
  }

  // Validate duration
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

  // Create recording promise
  const recordingPromise = (async (): Promise<RecordingResult> => {
    try {
      // Get audio data from buffer
      const buffer = audioBufferManager.getBuffer(channelId);
      const audioData = await buffer.getAudioData(duration);

      // Resample from 48kHz (Discord default) to 32kHz
      const resampledData = resampleAudio(
        audioData,
        48000,
        AUDIO.SAMPLE_RATE
      );

      // Ensure recordings directory exists
      const recordingsDir = join(process.cwd(), env.RECORDINGS_DIR);
      if (!existsSync(recordingsDir)) {
        mkdirSync(recordingsDir, { recursive: true });
      }

      // Check if file needs to be split
      const estimatedSize = resampledData.length + 44; // WAV header is 44 bytes
      const maxSize = DISCORD_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;

      if (shouldSplitFile(estimatedSize)) {
        // Split into multiple files
        const splitSize = Math.floor(maxSize * 0.9); // Use 90% of max to be safe
        const parts = splitAudioBuffer(resampledData, splitSize);
        const filePaths: string[] = [];

        for (let i = 0; i < parts.length; i++) {
          const fileName = generateFileName(duration).replace(
            '.wav',
            `_part${i + 1}.wav`
          );
          const filePath = join(recordingsDir, fileName);

          const header = createWAVHeader(parts[i].length);
          const fileStream = createWriteStream(filePath);

          await new Promise<void>((resolve, reject) => {
            fileStream.write(header, (error) => {
              if (error) {
                reject(error);
                return;
              }
              fileStream.write(parts[i], (error) => {
                if (error) {
                  reject(error);
                  return;
                }
                fileStream.end(resolve);
              });
            });
          });

          filePaths.push(filePath);
        }

        return {
          filePath: filePaths[0],
          fileSize: statSync(filePaths[0]).size,
          duration,
          isSplit: true,
          additionalFiles: filePaths.slice(1),
        };
      } else {
        // Single file
        const fileName = generateFileName(duration);
        const filePath = join(recordingsDir, fileName);

        const header = createWAVHeader(resampledData.length);
        const fileStream = createWriteStream(filePath);

        await new Promise<void>((resolve, reject) => {
          fileStream.write(header, (error) => {
            if (error) {
              reject(error);
              return;
            }
            fileStream.write(resampledData, (error) => {
              if (error) {
                reject(error);
                return;
              }
              fileStream.end(resolve);
            });
          });
        });

        const fileSize = statSync(filePath).size;

        return {
          filePath,
          fileSize,
          duration,
          isSplit: false,
        };
      }
    } finally {
      recordingQueues.delete(channelId);
    }
  })();

  recordingQueues.set(channelId, recordingPromise);

  return recordingPromise;
}

/**
 * Parse duration string (e.g., "30s", "1m", "5m")
 */
export function parseDurationString(durationStr: string): number {
  return parseDuration(durationStr);
}
