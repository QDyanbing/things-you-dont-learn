/**
 * Upload status exposed to UI and adapter consumers.
 *
 * The state machine intentionally separates file preprocessing (`hashing`)
 * from network work (`uploading`) so UI can explain where time is spent.
 */
export type UploadStatus =
  | 'idle'
  | 'hashing'
  | 'ready'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'canceled';

/**
 * Stable file identity used to locate local checkpoints.
 *
 * This is intentionally cheaper than a full file hash so it can be computed
 * immediately after the user selects a file.
 */
export interface UploadFileIdentity {
  signature: string;
  name: string;
  size: number;
  lastModified: number;
  type: string;
}

/**
 * Immutable chunk description produced from a file and a part size.
 *
 * The descriptor is passed through the whole pipeline so progress tracking,
 * hash calculation, and adapter uploads all agree on byte ranges.
 */
export interface UploadChunkDescriptor {
  index: number;
  partNumber: number;
  start: number;
  end: number;
  size: number;
}

/**
 * Minimal information needed to treat a chunk as "uploaded".
 *
 * Different backends return different confirmation payloads, so optional
 * metadata such as `etag` and `partHash` are preserved when available.
 */
export interface UploadPartRecord {
  partNumber: number;
  size?: number;
  etag?: string;
  partHash?: string;
}

/**
 * Retry policy for a single chunk upload task.
 *
 * `factor` and `jitterRatio` are used together to build an exponential backoff
 * curve that is friendlier to unstable networks and rate-limited backends.
 */
export interface UploadRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitterRatio: number;
}

/**
 * Derived flags that help the UI explain how the current upload started.
 */
export interface UploadFlags {
  resumedFromCheckpoint: boolean;
  resumedFromRemote: boolean;
  instantUpload: boolean;
}

/**
 * Serializable error shape stored on snapshots and emitted in events.
 */
export interface UploadErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Aggregated progress data for both preprocessing and network phases.
 */
export interface UploadProgressState {
  hashingPercent: number;
  uploadPercent: number;
  overallPercent: number;
  uploadedBytes: number;
  confirmedUploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  remainingBytes: number;
  estimatedRemainingMs: number | null;
}

/**
 * Single source of truth for rendering upload state in UI.
 *
 * Consumers should prefer binding to this object instead of duplicating
 * independent flags, progress values, and upload metadata in component state.
 */
export interface UploadSnapshot<TResult = unknown, TServerContext = unknown> {
  status: UploadStatus;
  file?: File;
  fileIdentity?: UploadFileIdentity;
  fileHash?: string;
  uploadId?: string;
  partSize: number;
  totalParts: number;
  uploadedPartNumbers: number[];
  pendingPartNumbers: number[];
  completedParts: UploadPartRecord[];
  progress: UploadProgressState;
  flags: UploadFlags;
  serverContext?: TServerContext;
  result?: TResult;
  error?: UploadErrorInfo;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

/**
 * Persisted checkpoint used for local resume after refresh or route changes.
 */
export interface UploadCheckpointRecord<TServerContext = unknown> {
  version: 1;
  fileIdentity: UploadFileIdentity;
  hashStrategyId: string;
  fileHash?: string;
  uploadId?: string;
  partSize: number;
  totalParts: number;
  completedParts: UploadPartRecord[];
  serverContext?: TServerContext;
  updatedAt: string;
}

/**
 * Storage adapter for persisted checkpoints.
 *
 * Implementations may use localStorage, IndexedDB, or even remote storage
 * depending on the host application requirements.
 */
export interface UploadCheckpointStore<TServerContext = unknown> {
  load(fileIdentity: UploadFileIdentity): Promise<UploadCheckpointRecord<TServerContext> | null> | UploadCheckpointRecord<TServerContext> | null;
  save(record: UploadCheckpointRecord<TServerContext>): Promise<void> | void;
  remove(fileSignature: string): Promise<void> | void;
}

/**
 * Strategy for producing a stable file hash before the upload begins.
 */
export interface FileHashStrategy {
  id: string;
  calculate(
    file: File,
    options?: {
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
    },
  ): Promise<string>;
}

/**
 * Strategy for producing a per-chunk integrity hash.
 */
export interface ChunkHashStrategy {
  id: string;
  calculate(
    chunk: Blob,
    descriptor: UploadChunkDescriptor,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<string>;
}

/**
 * Input for bootstrapping or restoring an upload session on the backend.
 */
export interface CreateUploadSessionInput<TServerContext = unknown> {
  file: File;
  fileIdentity: UploadFileIdentity;
  fileHash: string;
  partSize: number;
  totalParts: number;
  existingUploadId?: string;
  checkpoint?: UploadCheckpointRecord<TServerContext> | null;
  signal?: AbortSignal;
}

/**
 * Backend response needed to continue an upload session.
 */
export interface CreateUploadSessionResult<TServerContext = unknown, TResult = unknown> {
  uploadId: string;
  partSize?: number;
  uploadedParts?: UploadPartRecord[];
  completed?: boolean;
  result?: TResult;
  serverContext?: TServerContext;
}

/**
 * Input for querying already confirmed chunks from the backend.
 */
export interface ListUploadedPartsInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash: string;
  serverContext?: TServerContext;
  signal?: AbortSignal;
}

/**
 * Normalized progress payload for a single chunk transfer.
 */
export interface UploadPartProgress {
  loaded: number;
  total: number;
  progress: number;
}

/**
 * Adapter input for sending one chunk to the backend.
 */
export interface UploadPartInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash: string;
  chunk: UploadChunkDescriptor;
  blob: Blob;
  partHash?: string;
  serverContext?: TServerContext;
  signal?: AbortSignal;
  onProgress?: (progress: UploadPartProgress) => void;
}

/**
 * Adapter response after a chunk upload finishes.
 */
export interface UploadPartResult<TServerContext = unknown> {
  part?: UploadPartRecord;
  uploadedParts?: UploadPartRecord[];
  serverContext?: TServerContext;
}

/**
 * Adapter input for finalizing a multipart upload on the backend.
 */
export interface CompleteUploadInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash: string;
  partSize: number;
  totalParts: number;
  completedParts: UploadPartRecord[];
  serverContext?: TServerContext;
  signal?: AbortSignal;
}

/**
 * Final response returned after backend-side merge/complete logic.
 */
export interface CompleteUploadResult<TServerContext = unknown, TResult = unknown> {
  result?: TResult;
  serverContext?: TServerContext;
}

/**
 * Optional cancellation payload forwarded to the adapter.
 */
export interface AbortUploadInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash?: string;
  serverContext?: TServerContext;
}

/**
 * Protocol boundary between the generic uploader and a concrete backend.
 */
export interface UploadAdapter<TServerContext = unknown, TResult = unknown> {
  createUploadSession(
    input: CreateUploadSessionInput<TServerContext>,
  ): Promise<CreateUploadSessionResult<TServerContext, TResult>>;
  listUploadedParts?(input: ListUploadedPartsInput<TServerContext>): Promise<UploadPartRecord[]>;
  uploadPart(input: UploadPartInput<TServerContext>): Promise<UploadPartResult<TServerContext>>;
  completeUpload?(input: CompleteUploadInput<TServerContext>): Promise<CompleteUploadResult<TServerContext, TResult>>;
  abortUpload?(input: AbortUploadInput<TServerContext>): Promise<void>;
}

/**
 * Public configuration for `LargeFileUploader`.
 */
export interface LargeFileUploaderOptions<TServerContext = unknown, TResult = unknown> {
  adapter: UploadAdapter<TServerContext, TResult>;
  partSize?: number;
  concurrency?: number;
  autoComplete?: boolean;
  verifyRemotePartsOnStart?: boolean;
  cleanupCheckpointWhenCompleted?: boolean;
  enableChunkHash?: boolean;
  checkpointStore?: UploadCheckpointStore<TServerContext>;
  hashStrategy?: FileHashStrategy;
  chunkHashStrategy?: ChunkHashStrategy;
  retry?: Partial<UploadRetryPolicy>;
  progressWeights?: {
    hash?: number;
    upload?: number;
  };
}

/**
 * Event payload emitted when a chunk-level lifecycle step occurs.
 */
export interface UploadChunkEvent<TResult = unknown, TServerContext = unknown> {
  chunk: UploadChunkDescriptor;
  snapshot: UploadSnapshot<TResult, TServerContext>;
}

/**
 * Event payload emitted during chunk transfer progress updates.
 */
export interface UploadChunkProgressEvent<TResult = unknown, TServerContext = unknown>
  extends UploadChunkEvent<TResult, TServerContext> {
  progress: UploadPartProgress;
}

/**
 * Event payload emitted before a chunk retry is scheduled.
 */
export interface UploadChunkRetryEvent<TResult = unknown, TServerContext = unknown>
  extends UploadChunkEvent<TResult, TServerContext> {
  attempt: number;
  delayMs: number;
  error: UploadErrorInfo;
}

export interface UploadErrorEvent<TResult = unknown, TServerContext = unknown> {
  error: UploadErrorInfo;
  snapshot: UploadSnapshot<TResult, TServerContext>;
}

/**
 * Complete event contract exposed by the uploader.
 */
export interface UploadEventMap<TResult = unknown, TServerContext = unknown> {
  snapshot: UploadSnapshot<TResult, TServerContext>;
  statusChange: UploadSnapshot<TResult, TServerContext>;
  progress: UploadSnapshot<TResult, TServerContext>;
  chunkStart: UploadChunkEvent<TResult, TServerContext>;
  chunkProgress: UploadChunkProgressEvent<TResult, TServerContext>;
  chunkSuccess: UploadChunkEvent<TResult, TServerContext>;
  chunkRetry: UploadChunkRetryEvent<TResult, TServerContext>;
  pause: UploadSnapshot<TResult, TServerContext>;
  resume: UploadSnapshot<TResult, TServerContext>;
  success: UploadSnapshot<TResult, TServerContext>;
  cancel: UploadSnapshot<TResult, TServerContext>;
  error: UploadErrorEvent<TResult, TServerContext>;
}
