/**
 * Default chunk size used when the caller does not provide a custom value.
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Public status exposed by the current coordinator instance.
 */
export type FileCoordinatorStatus =
  | 'INIT'
  | 'PREPARING'
  | 'READY'
  | 'UPLOADING'
  | 'PAUSED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'CANCELED'
  | 'ERROR';

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

/**
 * Coordinates one file instance and prepares internal chunk metadata for later upload steps.
 */
export class FileCoordinator {
  /**
   * Original file selected by the caller.
   */
  private readonly file: File;
  /**
   * Normalized options stored for the current coordinator instance.
   */
  private readonly options: FileCoordinatorOptions;
  /**
   * Internal chunk list used by later upload scheduling logic.
   */
  private readonly chunks: FileCoordinatorChunk[];
  /**
   * Current runtime status of the coordinator.
   */
  private status!: FileCoordinatorStatus;

  /**
   * Creates a coordinator bound to one selected file.
   *
   * @param file File selected by the user.
   * @param options Runtime configuration for the current file.
   */
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
    this.setStatus('INIT');
  }

  /**
   * Returns the original `File` instance bound to the coordinator.
   */
  getFile() {
    return this.file;
  }

  /**
   * Returns the normalized runtime options of the current coordinator.
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Returns the current runtime status of the coordinator.
   */
  getStatus() {
    return this.status;
  }

  /**
   * Runs the first-stage preparation flow for the current file.
   */
  async prepare() {
    this.setStatus('PREPARING');
    this.setStatus('READY');
  }

  /**
   * Returns the total number of chunks generated for the current file.
   */
  getChunkCount() {
    return this.chunks.length;
  }

  /**
   * Updates the internal runtime status of the coordinator.
   */
  private setStatus(status: FileCoordinatorStatus) {
    this.status = status;
  }

  /**
   * Splits the current file into deterministic chunks based on `chunkSize`.
   */
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
