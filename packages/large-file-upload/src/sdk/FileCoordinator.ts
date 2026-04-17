const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

export interface FileCoordinatorOptions {
  chunkSize?: number;
}

interface FileCoordinatorChunk {
  index: number;
  start: number;
  end: number;
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
