import type { FileHashStrategy } from '../types';

const DEFAULT_SAMPLE_SIZE = 256 * 1024;
const DEFAULT_SAMPLE_COUNT = 8;

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

async function readBlob(blob: Blob, signal?: AbortSignal) {
  assertNotAborted(signal);
  const buffer = await blob.arrayBuffer();
  assertNotAborted(signal);
  return new Uint8Array(buffer);
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

function numberToBytes(value: number) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value);
  return new Uint8Array(buffer);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * File hash strategy optimized for large files.
 *
 * Small files are hashed in full, while large files are hashed from evenly
 * distributed samples plus file size metadata. That keeps the hashing stage
 * fast enough for UI use while still remaining stable for resume/秒传 checks.
 */
export class SampledFileHashStrategy implements FileHashStrategy {
  readonly id = 'sampled-sha256-v1';

  constructor(
    private readonly options: {
      sampleSize?: number;
      sampleCount?: number;
    } = {},
  ) {}

  async calculate(
    file: File,
    options?: {
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
    },
  ) {
    const sampleSize = Math.max(32 * 1024, this.options.sampleSize ?? DEFAULT_SAMPLE_SIZE);
    const sampleCount = Math.max(3, this.options.sampleCount ?? DEFAULT_SAMPLE_COUNT);
    const totalSteps = file.size <= sampleSize * sampleCount ? 2 : sampleCount + 1;
    let completedSteps = 0;

    const markProgress = () => {
      completedSteps += 1;
      options?.onProgress?.(Math.min(1, completedSteps / totalSteps));
    };

    if (file.size <= sampleSize * sampleCount) {
      // Small files are cheap enough to hash fully, which avoids false positives.
      const fullBuffer = await readBlob(file, options?.signal);
      markProgress();
      const digest = await crypto.subtle.digest('SHA-256', fullBuffer);
      markProgress();
      return toHex(digest);
    }

    // Prefixing file size makes the sampled hash less collision-prone for files
    // that happen to share the same sampled byte windows.
    const slices: Uint8Array[] = [numberToBytes(file.size)];
    const maxOffset = Math.max(0, file.size - sampleSize);

    for (let index = 0; index < sampleCount; index += 1) {
      // Samples are spread across the whole file so middle and tail changes
      // affect the result instead of over-weighting the first chunk.
      const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
      const start = Math.min(Math.floor(maxOffset * ratio), maxOffset);
      const end = Math.min(file.size, start + sampleSize);
      const chunk = await readBlob(file.slice(start, end), options?.signal);
      slices.push(chunk);
      markProgress();
    }

    const digest = await crypto.subtle.digest('SHA-256', concatUint8Arrays(slices));
    markProgress();
    return toHex(digest);
  }
}
