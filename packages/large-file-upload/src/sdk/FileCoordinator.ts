/**
 * Default chunk size used when the caller does not provide a custom value.
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Default concurrent chunk upload count used by the coordinator.
 */
const DEFAULT_CONCURRENCY = 1;

/**
 * Normalizes the public chunk size into the effective runtime value.
 */
function normalizeChunkSize(chunkSize?: number): number {
  return Math.max(1, chunkSize ?? DEFAULT_CHUNK_SIZE);
}

/**
 * Normalizes the public concurrency into the effective runtime value.
 */
function normalizeConcurrency(concurrency?: number): number {
  return Math.max(1, Math.floor(concurrency ?? DEFAULT_CONCURRENCY));
}

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
 * Lightweight identity string derived from stable file metadata.
 *
 * This identity is still metadata-based and is not a content hash.
 */
export type FileCoordinatorFileIdentity = string;

/**
 * Stable identity string of one prepared chunk.
 */
export type FileCoordinatorChunkIdentity = string;

/**
 * Runtime status tracked for one prepared chunk.
 */
export type FileCoordinatorChunkStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'SUCCESS'
  | 'ERROR';

/**
 * Custom identity factory provided by the caller.
 */
export type FileCoordinatorCreateFileIdentity = (
  file: File,
) => FileCoordinatorFileIdentity;

/**
 * Caller-provided uploader used by the coordinator to send one chunk.
 */
export type FileCoordinatorUploadChunkHandler = (
  params: FileCoordinatorUploadChunkParams,
) => Promise<void>;

/**
 * Returns the relative path attached by directory uploads when available.
 */
function getFileRelativePath(file: File): string {
  return 'webkitRelativePath' in file ? file.webkitRelativePath ?? '' : '';
}

/**
 * Hashes plain text into a compact base36 token for metadata ids.
 */
function hashText(value: string): string {
  let primaryHash = 2166136261;
  let secondaryHash = 3335557771;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    primaryHash ^= code;
    primaryHash = Math.imul(primaryHash, 16777619);

    secondaryHash ^= code;
    secondaryHash = Math.imul(secondaryHash, 2246822519);
  }

  return `${(primaryHash >>> 0).toString(36)}${(secondaryHash >>> 0).toString(
    36,
  )}`.slice(0, 12);
}

/**
 * Creates the default short identity string for the current file.
 *
 * The default implementation compresses stable file metadata into a
 * short token without reading file content.
 */
function createDefaultFileIdentity(file: File): FileCoordinatorFileIdentity {
  const identitySource = [
    file.name,
    file.size,
    file.type,
    file.lastModified,
    getFileRelativePath(file),
  ].join('__');

  return `file_${hashText(identitySource)}`;
}

function createChunkIdentity(
  fileIdentity: FileCoordinatorFileIdentity,
  index: number,
  start: number,
  end: number,
): FileCoordinatorChunkIdentity {
  return `chunk_${hashText([fileIdentity, index, start, end].join('__'))}`;
}

/**
 * Normalizes the public chunk index into an internal array index.
 */
function normalizeChunkIndex(index: number): number | null {
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }

  return index;
}

/**
 * Public configuration accepted by a single `FileCoordinator` instance.
 */
export interface FileCoordinatorOptions {
  /**
   * Chunk size in bytes used to split the current file.
   */
  chunkSize?: number;
  /**
   * Maximum chunk upload count allowed to run at the same time.
   */
  concurrency?: number;
  /**
   * Custom file identity generator used to override the default short id.
   */
  createFileIdentity?: FileCoordinatorCreateFileIdentity;
  /**
   * Caller-provided uploader responsible for sending one prepared chunk.
   */
  uploadChunk?: FileCoordinatorUploadChunkHandler;
}

export interface FileCoordinatorResolvedOptions {
  /**
   * Effective chunk size normalized by the coordinator constructor.
   */
  chunkSize: number;
  /**
   * Effective concurrent chunk upload count used by the current coordinator.
   */
  concurrency: number;
  /**
   * Effective file identity generator used by the current coordinator.
   */
  createFileIdentity: FileCoordinatorCreateFileIdentity;
  /**
   * Effective single chunk uploader stored by the current coordinator.
   */
  uploadChunk?: FileCoordinatorUploadChunkHandler;
}

/**
 * Public metadata of one prepared chunk.
 */
export interface FileCoordinatorChunkInfo {
  /**
   * Zero-based chunk index.
   */
  index: number;
  /**
   * Stable identity of the current chunk.
   *
   * Useful for mapping upload records or retry state outside the SDK.
   */
  chunkIdentity: FileCoordinatorChunkIdentity;
  /**
   * MIME type inherited from the original file when available.
   *
   * This mirrors the type used by `getChunk()`.
   */
  type: string;
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
 * Input payload passed to the caller-provided single chunk uploader.
 */
export interface FileCoordinatorUploadChunkParams {
  file: File;
  fileIdentity: FileCoordinatorFileIdentity;
  chunkInfo: FileCoordinatorChunkInfo;
  chunk: Blob;
  /**
   * Abort signal controlled by the coordinator for the current upload task.
   */
  signal: AbortSignal;
  /**
   * Reports the latest uploaded byte count of the current chunk back to the SDK.
   */
  reportProgress: (loaded: number, total?: number) => void;
}

interface FileCoordinatorChunkRecord extends FileCoordinatorChunkInfo {
  status: FileCoordinatorChunkStatus;
  uploadedBytes: number;
}

/**
 * Lightweight summary returned after one preparation pass completes.
 */
export interface FileCoordinatorPrepareResult {
  /**
   * Stable identity of the current file.
   */
  fileIdentity: FileCoordinatorFileIdentity;
  /**
   * File size of the current file in bytes.
   *
   * Exposed here so the caller can use the prepare summary directly.
   */
  fileSize: number;
  /**
   * Runtime status captured after the current preparation pass.
   */
  status: FileCoordinatorStatus;
  /**
   * Total chunk count generated by the current preparation pass.
   */
  chunkCount: number;
  /**
   * Effective chunk size used by the current preparation pass.
   */
  chunkSize: number;
}

/**
 * Aggregated upload progress snapshot of the current file.
 */
export interface FileCoordinatorProgress {
  totalBytes: number;
  uploadedBytes: number;
  percent: number;
  chunkCount: number;
  uploadedChunkCount: number;
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
   * Stable identity generated for the current file.
   */
  private readonly fileIdentity: FileCoordinatorFileIdentity;
  /**
   * Normalized options stored for the current coordinator instance.
   */
  private readonly options: FileCoordinatorResolvedOptions;
  /**
   * Internal chunk list used by later upload scheduling logic.
   */
  private chunks: FileCoordinatorChunkRecord[];
  /**
   * Active preparation task reused by concurrent `prepare()` calls.
   */
  private preparePromise: Promise<FileCoordinatorPrepareResult> | null = null;
  /**
   * Active upload task reused by concurrent `upload()` calls.
   */
  private uploadPromise: Promise<void> | null = null;
  /**
   * Latest successful preparation summary of the current file.
   */
  private prepareResult: FileCoordinatorPrepareResult | null = null;
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
    const resolvedOptions: FileCoordinatorResolvedOptions = {
      ...options,
      chunkSize: normalizeChunkSize(options.chunkSize),
      concurrency: normalizeConcurrency(options.concurrency),
      createFileIdentity:
        options.createFileIdentity ?? createDefaultFileIdentity,
    };
    this.options = resolvedOptions;
    this.fileIdentity = resolvedOptions.createFileIdentity(this.file);
    this.chunks = [];
    this.setStatus('INIT');
  }

  /**
   * Returns the original `File` instance bound to the coordinator.
   */
  getFile() {
    return this.file;
  }

  /**
   * Returns the stable identity string of the current file.
   */
  getFileIdentity() {
    return this.fileIdentity;
  }

  /**
   * Returns the normalized runtime options of the current coordinator.
   *
   * Unlike the input `FileCoordinatorOptions`, the returned object always
   * contains the resolved `chunkSize` and `concurrency`.
   */
  getOptions(): FileCoordinatorResolvedOptions {
    return { ...this.options };
  }

  /**
   * Updates the effective chunk size of the current coordinator.
   *
   * Changing the chunk size clears prepared chunks and moves the status back
   * to `INIT` so the caller can run `prepare()` again with the new setting.
   */
  setChunkSize(chunkSize: number): number {
    const normalizedChunkSize = normalizeChunkSize(chunkSize);

    if (normalizedChunkSize === this.options.chunkSize) {
      return this.options.chunkSize;
    }

    this.options.chunkSize = normalizedChunkSize;
    this.prepareResult = null;
    this.resetChunks();
    this.setStatus('INIT');

    return this.options.chunkSize;
  }

  /**
   * Returns the current runtime status of the coordinator.
   */
  getStatus() {
    return this.status;
  }

  /**
   * Returns whether the current coordinator has completed preparation.
   */
  isPrepared(): boolean {
    return this.status === 'READY';
  }

  /**
   * Runs the first-stage preparation flow for the current file.
   *
   * Repeated calls are safe. When a preparation task is already running,
   * later callers reuse the same promise instead of starting a new run.
   *
   * Returns a lightweight summary of the prepared file metadata.
   */
  async prepare() {
    if (this.preparePromise) {
      return this.preparePromise;
    }

    const prepareTask = (async () => {
      this.setStatus('PREPARING');
      this.prepareResult = null;
      this.resetChunks();
      this.chunks = this.createChunks();
      this.setStatus('READY');
      this.prepareResult = this.createPrepareResult();
      return this.prepareResult;
    })();

    const wrappedPrepareTask = prepareTask.finally(() => {
      if (this.preparePromise === wrappedPrepareTask) {
        this.preparePromise = null;
      }
    });

    this.preparePromise = wrappedPrepareTask;
    return wrappedPrepareTask;
  }

  /**
   * Returns the total number of chunks generated for the current file.
   */
  getChunkCount() {
    return this.chunks.length;
  }

  /**
   * Returns whether one prepared chunk exists at the provided index.
   */
  hasChunk(index: number): boolean {
    return this.findChunk(index) !== null;
  }

  /**
   * Returns the current runtime status of one prepared chunk by index.
   */
  getChunkStatus(index: number): FileCoordinatorChunkStatus | null {
    return this.findChunk(index)?.status ?? null;
  }

  /**
   * Updates the current runtime status of one prepared chunk by index.
   */
  setChunkStatus(
    index: number,
    status: FileCoordinatorChunkStatus,
  ): boolean {
    const chunk = this.findChunk(index);

    if (!chunk) {
      return false;
    }

    chunk.status = status;

    if (status === 'PENDING') {
      chunk.uploadedBytes = 0;
    }

    if (status === 'SUCCESS') {
      chunk.uploadedBytes = chunk.size;
    }

    return true;
  }

  /**
   * Marks a batch of prepared chunks as uploaded by index.
   */
  setUploadedChunks(indexes: number[]): number {
    const uniqueIndexes = [...new Set(indexes)];
    let restoredChunkCount = 0;

    uniqueIndexes.forEach((index) => {
      const chunk = this.findChunk(index);

      if (!chunk) {
        return;
      }

      chunk.status = 'SUCCESS';
      chunk.uploadedBytes = chunk.size;
      restoredChunkCount += 1;
    });

    return restoredChunkCount;
  }

  /**
   * Returns whether one prepared chunk has been marked as uploaded.
   */
  isChunkUploaded(index: number): boolean {
    return this.getChunkStatus(index) === 'SUCCESS';
  }

  /**
   * Returns how many prepared chunks have been marked as uploaded.
   */
  getUploadedChunkCount(): number {
    return this.chunks.reduce((uploadedChunkCount, chunk) => {
      return uploadedChunkCount + (chunk.status === 'SUCCESS' ? 1 : 0);
    }, 0);
  }

  /**
   * Returns the aggregated upload progress snapshot of the current file.
   */
  getProgress(): FileCoordinatorProgress {
    const uploadedBytes = this.chunks.reduce((currentUploadedBytes, chunk) => {
      return currentUploadedBytes + this.getChunkUploadedBytesForProgress(chunk);
    }, 0);
    const totalBytes = this.file.size;

    return {
      totalBytes,
      uploadedBytes,
      percent: totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0,
      chunkCount: this.chunks.length,
      uploadedChunkCount: this.getUploadedChunkCount(),
    };
  }

  /**
   * Returns chunk indexes that still need to enter the upload flow.
   */
  getPendingChunkIndexes(): number[] {
    return this.chunks.reduce<number[]>((pendingChunkIndexes, chunk) => {
      if (chunk.status === 'PENDING' || chunk.status === 'ERROR') {
        pendingChunkIndexes.push(chunk.index);
      }

      return pendingChunkIndexes;
    }, []);
  }

  /**
   * Uploads every pending chunk through the configured concurrent scheduler.
   */
  async upload(): Promise<void> {
    this.ensurePreparedForUpload();

    if (this.uploadPromise) {
      return this.uploadPromise;
    }

    const uploadTask = (async () => {
      const pendingChunkIndexes = this.getPendingChunkIndexes();

      if (pendingChunkIndexes.length === 0) {
        this.setStatus(
          this.getUploadedChunkCount() === this.getChunkCount()
            ? 'COMPLETED'
            : 'READY',
        );
        return;
      }

      this.setStatus('UPLOADING');

      try {
        await this.uploadPendingChunks(pendingChunkIndexes);
        this.setStatus(
          this.getUploadedChunkCount() === this.getChunkCount()
            ? 'COMPLETED'
            : 'READY',
        );
      } catch (error) {
        this.setStatus('ERROR');
        throw error;
      }
    })();

    const wrappedUploadTask = uploadTask.finally(() => {
      if (this.uploadPromise === wrappedUploadTask) {
        this.uploadPromise = null;
      }
    });

    this.uploadPromise = wrappedUploadTask;
    return wrappedUploadTask;
  }

  /**
   * Uploads one prepared chunk through the caller-provided upload handler.
   */
  async uploadChunk(index: number): Promise<void> {
    this.ensurePreparedForUpload();
    this.setChunkStatus(index, 'UPLOADING');
    this.setStatus('UPLOADING');

    try {
      await this.uploadPreparedChunk(index);
      this.setStatus(
        this.getUploadedChunkCount() === this.getChunkCount()
          ? 'COMPLETED'
          : 'READY',
      );
    } catch (error) {
      this.setChunkStatus(index, 'ERROR');
      this.setStatus('ERROR');
      throw error;
    }
  }

  /**
   * Returns the stable identity of one prepared chunk by index.
   */
  getChunkIdentity(index: number): FileCoordinatorChunkIdentity | null {
    return this.findChunk(index)?.chunkIdentity ?? null;
  }

  /**
   * Returns the public metadata of one prepared chunk by index.
   *
   * Use this when the caller only needs offsets and type information.
   */
  getChunkInfo(index: number): FileCoordinatorChunkInfo | null {
    const chunk = this.findChunk(index);

    if (!chunk) {
      return null;
    }

    return {
      index: chunk.index,
      chunkIdentity: chunk.chunkIdentity,
      type: chunk.type,
      start: chunk.start,
      end: chunk.end,
      size: chunk.size,
    };
  }

  /**
   * Returns the chunk blob selected by the provided prepared index.
   *
   * The returned blob keeps the original file MIME type when available.
   */
  getChunk(index: number): Blob | null {
    const chunk = this.findChunk(index);

    if (!chunk) {
      return null;
    }

    return this.file.slice(chunk.start, chunk.end, this.file.type);
  }

  /**
   * Returns the latest successful preparation summary.
   */
  getPrepareResult() {
    if (!this.prepareResult) {
      return null;
    }

    return { ...this.prepareResult };
  }

  /**
   * Updates the internal runtime status of the coordinator.
   */
  private setStatus(status: FileCoordinatorStatus) {
    this.status = status;
  }

  /**
   * Throws when upload is requested before a successful `prepare()` run.
   */
  private ensurePreparedForUpload() {
    if (!this.prepareResult) {
      throw new Error('FileCoordinator prepare() must complete before upload.');
    }
  }

  /**
   * Clears the previously prepared chunk metadata before rebuilding it.
   */
  private resetChunks() {
    this.chunks = [];
  }

  /**
   * Creates the public summary object returned by `prepare()`.
   */
  private createPrepareResult(): FileCoordinatorPrepareResult {
    return {
      fileIdentity: this.fileIdentity,
      fileSize: this.file.size,
      status: this.status,
      chunkCount: this.chunks.length,
      chunkSize: this.options.chunkSize,
    };
  }

  /**
   * Finds one prepared chunk from the internal chunk list.
   */
  private findChunk(index: number): FileCoordinatorChunkRecord | null {
    const normalizedIndex = normalizeChunkIndex(index);

    if (normalizedIndex === null) {
      return null;
    }

    return this.chunks[normalizedIndex] ?? null;
  }

  /**
   * Runs the caller-provided upload handler for one prepared chunk.
   */
  private async uploadPreparedChunk(index: number): Promise<void> {
    if (!this.options.uploadChunk) {
      throw new Error('FileCoordinator uploadChunk handler is not configured.');
    }

    const chunkInfo = this.getChunkInfo(index);
    const chunk = this.getChunk(index);

    if (!chunkInfo || !chunk) {
      throw new Error(`FileCoordinator chunk at index ${index} is not available.`);
    }

    this.setChunkStatus(index, 'UPLOADING');
    this.updateChunkUploadedBytes(index, 0);

    try {
      await this.options.uploadChunk({
        file: this.file,
        fileIdentity: this.fileIdentity,
        chunkInfo,
        chunk,
        signal: new AbortController().signal,
        reportProgress: (loaded, total) => {
          this.updateChunkUploadedBytes(index, loaded, total);
        },
      });

      this.setChunkStatus(index, 'SUCCESS');
    } catch (error) {
      this.setChunkStatus(index, 'ERROR');
      throw error;
    }
  }

  /**
   * Uploads a batch of prepared chunks with the configured concurrency.
   */
  private async uploadPendingChunks(indexes: number[]): Promise<void> {
    const pendingIndexes = [...indexes];
    const workerCount = Math.min(this.options.concurrency, pendingIndexes.length);
    let firstError: unknown = null;

    const runWorker = async () => {
      while (pendingIndexes.length > 0) {
        if (firstError) {
          return;
        }

        const index = pendingIndexes.shift();

        if (index === undefined) {
          return;
        }

        try {
          await this.uploadPreparedChunk(index);
        } catch (error) {
          if (!firstError) {
            firstError = error;
          }

          return;
        }
      }
    };

    await Promise.all(
      Array.from({ length: workerCount }, () => {
        return runWorker();
      }),
    );

    if (firstError) {
      throw firstError;
    }
  }

  /**
   * Stores the latest uploaded byte count of one prepared chunk.
   */
  private updateChunkUploadedBytes(
    index: number,
    loaded: number,
    total?: number,
  ) {
    const chunk = this.findChunk(index);

    if (!chunk) {
      return;
    }

    const normalizedLoaded = Math.max(0, loaded);
    const effectiveTotal = total ?? chunk.size;
    const normalizedTotal = Math.max(1, effectiveTotal);

    chunk.uploadedBytes = Math.min(normalizedLoaded, normalizedTotal, chunk.size);
  }

  /**
   * Returns the current byte contribution of one chunk in the public progress snapshot.
   */
  private getChunkUploadedBytesForProgress(
    chunk: FileCoordinatorChunkRecord,
  ): number {
    if (chunk.status === 'SUCCESS') {
      return chunk.size;
    }

    if (chunk.status === 'UPLOADING') {
      return chunk.uploadedBytes;
    }

    return 0;
  }

  /**
   * Splits the current file into deterministic chunks based on `chunkSize`.
   */
  private createChunks(): FileCoordinatorChunkRecord[] {
    const chunkSize = this.options.chunkSize;

    if (this.file.size === 0) {
      return [];
    }

    const chunks: FileCoordinatorChunkRecord[] = [];
    let start = 0;
    let index = 0;

    while (start < this.file.size) {
      const end = Math.min(start + chunkSize, this.file.size);

      chunks.push({
        index,
        chunkIdentity: createChunkIdentity(this.fileIdentity, index, start, end),
        status: 'PENDING',
        uploadedBytes: 0,
        type: this.file.type,
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
