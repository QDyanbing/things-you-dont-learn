/**
 * Default chunk size used when the caller does not provide a custom value.
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Public configuration accepted by a single `FileCoordinator` instance.
 */
export interface FileCoordinatorOptions {
  /**
   * Chunk size in bytes used to split the current file.
   */
  chunkSize?: number;
}

/**
 * Internal descriptor used to represent one file chunk.
 */
interface FileCoordinatorChunk {
  /**
   * Zero-based chunk index.
   */
  index: number;
  /**
   * Inclusive start byte offset of the chunk.
   */
  start: number;
  /**
   * Exclusive end byte offset of the chunk.
   */
  end: number;
  /**
   * Byte length of the chunk.
   */
  size: number;
}

export class FileCoordinator {
  private readonly file: File;
  private readonly options: FileCoordinatorOptions;
  private readonly chunks: FileCoordinatorChunk[];

  constructor(
    file: File,
    options: FileCoordinatorOptions = {},
  ) {
    this.file = file;
    this.options = {
      ...options,
      chunkSize: Math.max(1, options.chunkSize ?? DEFAULT_CHUNK_SIZE),
    };
    this.chunks = this.createChunks();
  }

  getFile() {
    return this.file;
  }

  getOptions() {
    return { ...this.options };
  }

  getChunkCount() {
    return this.chunks.length;
  }

  private createChunks(): FileCoordinatorChunk[] {
    const chunkSize = this.options.chunkSize ?? DEFAULT_CHUNK_SIZE;

    if (this.file.size === 0) {
      return [];
    }

    const chunks: FileCoordinatorChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < this.file.size) {
      const end = Math.min(start + chunkSize, this.file.size);

      chunks.push({
        index,
        start,
        end,
        size: end - start,
      });

      start = end;
      index += 1;
    }

    return chunks;
  }
}
