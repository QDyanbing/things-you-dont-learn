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

export interface UploadRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface UploadFlags {
  resumedFromCheckpoint: boolean;
  resumedFromRemote: boolean;
  instantUpload: boolean;
}

export interface UploadErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

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

export interface UploadCheckpointStore<TServerContext = unknown> {
  load(fileIdentity: UploadFileIdentity): Promise<UploadCheckpointRecord<TServerContext> | null> | UploadCheckpointRecord<TServerContext> | null;
  save(record: UploadCheckpointRecord<TServerContext>): Promise<void> | void;
  remove(fileSignature: string): Promise<void> | void;
}

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

export interface CreateUploadSessionResult<TServerContext = unknown, TResult = unknown> {
  uploadId: string;
  partSize?: number;
  uploadedParts?: UploadPartRecord[];
  completed?: boolean;
  result?: TResult;
  serverContext?: TServerContext;
}

export interface ListUploadedPartsInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash: string;
  serverContext?: TServerContext;
  signal?: AbortSignal;
}

export interface UploadPartProgress {
  loaded: number;
  total: number;
  progress: number;
}

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

export interface UploadPartResult<TServerContext = unknown> {
  part?: UploadPartRecord;
  uploadedParts?: UploadPartRecord[];
  serverContext?: TServerContext;
}

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

export interface CompleteUploadResult<TServerContext = unknown, TResult = unknown> {
  result?: TResult;
  serverContext?: TServerContext;
}

export interface AbortUploadInput<TServerContext = unknown> {
  uploadId: string;
  file: File;
  fileHash?: string;
  serverContext?: TServerContext;
}

export interface UploadAdapter<TServerContext = unknown, TResult = unknown> {
  createUploadSession(
    input: CreateUploadSessionInput<TServerContext>,
  ): Promise<CreateUploadSessionResult<TServerContext, TResult>>;
  listUploadedParts?(input: ListUploadedPartsInput<TServerContext>): Promise<UploadPartRecord[]>;
  uploadPart(input: UploadPartInput<TServerContext>): Promise<UploadPartResult<TServerContext>>;
  completeUpload?(input: CompleteUploadInput<TServerContext>): Promise<CompleteUploadResult<TServerContext, TResult>>;
  abortUpload?(input: AbortUploadInput<TServerContext>): Promise<void>;
}

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

export interface UploadChunkEvent<TResult = unknown, TServerContext = unknown> {
  chunk: UploadChunkDescriptor;
  snapshot: UploadSnapshot<TResult, TServerContext>;
}

export interface UploadChunkProgressEvent<TResult = unknown, TServerContext = unknown>
  extends UploadChunkEvent<TResult, TServerContext> {
  progress: UploadPartProgress;
}

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
