import type { ChunkHashStrategy, UploadChunkDescriptor } from '../types';

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export class Sha256ChunkHashStrategy implements ChunkHashStrategy {
  readonly id = 'chunk-sha256-v1';

  async calculate(
    chunk: Blob,
    descriptor: UploadChunkDescriptor,
    options?: {
      signal?: AbortSignal;
    },
  ) {
    assertNotAborted(options?.signal);
    const chunkBuffer = await chunk.arrayBuffer();
    assertNotAborted(options?.signal);

    const descriptorBuffer = new TextEncoder().encode(
      `${descriptor.partNumber}:${descriptor.start}:${descriptor.end}:${descriptor.size}`,
    );
    const payload = new Uint8Array(descriptorBuffer.byteLength + chunkBuffer.byteLength);

    payload.set(descriptorBuffer, 0);
    payload.set(new Uint8Array(chunkBuffer), descriptorBuffer.byteLength);

    const digest = await crypto.subtle.digest('SHA-256', payload);
    assertNotAborted(options?.signal);
    return toHex(digest);
  }
}
