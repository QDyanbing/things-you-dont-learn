import { SampledFileHashStrategy } from '../hashers/SampledFileHashStrategy';
import { Sha256ChunkHashStrategy } from '../hashers/Sha256ChunkHashStrategy';
import { LocalStorageCheckpointStore } from '../persistence/LocalStorageCheckpointStore';
import type {
  ChunkHashStrategy,
  FileHashStrategy,
  LargeFileUploaderOptions,
  UploadAdapter,
  UploadCheckpointRecord,
  UploadCheckpointStore,
  UploadChunkDescriptor,
  UploadErrorInfo,
  UploadEventMap,
  UploadFileIdentity,
  UploadPartProgress,
  UploadPartRecord,
  UploadProgressState,
  UploadRetryPolicy,
  UploadSnapshot,
  UploadStatus,
} from '../types';
import { UploadEventEmitter } from './UploadEventEmitter';

const DEFAULT_PART_SIZE = 5 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_RETRY_POLICY: UploadRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  factor: 2,
  maxDelayMs: 10_000,
  jitterRatio: 0.2,
};

const DEFAULT_PROGRESS_STATE: UploadProgressState = {
  hashingPercent: 0,
  uploadPercent: 0,
  overallPercent: 0,
  uploadedBytes: 0,
  confirmedUploadedBytes: 0,
  totalBytes: 0,
  speedBps: 0,
  remainingBytes: 0,
  estimatedRemainingMs: null,
};

function createFileIdentity(file: File): UploadFileIdentity {
  return {
    signature: `${file.name}__${file.size}__${file.lastModified}`,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    type: file.type,
  };
}

function createChunks(file: File, partSize: number) {
  const chunks: UploadChunkDescriptor[] = [];
  let start = 0;
  let index = 0;

  while (start < file.size) {
    const end = Math.min(file.size, start + partSize);
    chunks.push({
      index,
      partNumber: index + 1,
      start,
      end,
      size: end - start,
    });
    start = end;
    index += 1;
  }

  if (chunks.length === 0) {
    chunks.push({
      index: 0,
      partNumber: 1,
      start: 0,
      end: 0,
      size: 0,
    });
  }

  return chunks;
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function toErrorInfo(error: unknown): UploadErrorInfo {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'Error',
    message: String(error),
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function mergeRetryPolicy(policy?: Partial<UploadRetryPolicy>): UploadRetryPolicy {
  return {
    ...DEFAULT_RETRY_POLICY,
    ...policy,
  };
}

function normalizeCompletedParts(parts: UploadPartRecord[]) {
  return [...parts]
    .sort((left, right) => left.partNumber - right.partNumber)
    .map((part) => ({
      ...part,
    }));
}

function createCheckpointStore<TServerContext>(store?: UploadCheckpointStore<TServerContext>) {
  if (store) {
    return store;
  }

  return new LocalStorageCheckpointStore<TServerContext>();
}

function computeRetryDelay(policy: UploadRetryPolicy, attempt: number) {
  const exponentialDelay = Math.min(policy.maxDelayMs, policy.baseDelayMs * policy.factor ** Math.max(0, attempt - 1));
  const jitterOffset = exponentialDelay * policy.jitterRatio * Math.random();
  return Math.round(exponentialDelay + jitterOffset);
}

interface ResolvedUploaderOptions<TServerContext, TResult> {
  adapter: UploadAdapter<TServerContext, TResult>;
  partSize: number;
  concurrency: number;
  autoComplete: boolean;
  verifyRemotePartsOnStart: boolean;
  cleanupCheckpointWhenCompleted: boolean;
  enableChunkHash: boolean;
  checkpointStore: UploadCheckpointStore<TServerContext>;
  hashStrategy: FileHashStrategy;
  chunkHashStrategy: ChunkHashStrategy;
  retry: UploadRetryPolicy;
  progressWeights: {
    hash: number;
    upload: number;
  };
}

export class LargeFileUploader<TServerContext = unknown, TResult = unknown> {
  private readonly options: ResolvedUploaderOptions<TServerContext, TResult>;
  private readonly emitter = new UploadEventEmitter<UploadEventMap<TResult, TServerContext>>();
  private readonly uploadedParts = new Map<number, UploadPartRecord>();
  private readonly activePartLoadedBytes = new Map<number, number>();
  private readonly activeControllers = new Map<number, AbortController>();

  private checkpoint: UploadCheckpointRecord<TServerContext> | null = null;
  private chunks: UploadChunkDescriptor[] = [];
  private file?: File;
  private fileIdentity?: UploadFileIdentity;
  private prepareController: AbortController | null = null;
  private destroyed = false;
  private pauseRequested = false;
  private cancelRequested = false;
  private hashProgress = 0;
  private currentRunToken = 0;
  private runPromise: Promise<TResult | undefined> | null = null;
  private progressTracker = {
    previousUploadedBytes: 0,
    previousTimestamp: 0,
    speedBps: 0,
  };

  private snapshot: UploadSnapshot<TResult, TServerContext>;

  constructor(options: LargeFileUploaderOptions<TServerContext, TResult>) {
    const progressWeights = {
      hash: options.progressWeights?.hash ?? 0.1,
      upload: options.progressWeights?.upload ?? 0.9,
    };
    const totalWeight = progressWeights.hash + progressWeights.upload;

    this.options = {
      adapter: options.adapter,
      partSize: Math.max(1024 * 1024, options.partSize ?? DEFAULT_PART_SIZE),
      concurrency: Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY),
      autoComplete: options.autoComplete ?? true,
      verifyRemotePartsOnStart: options.verifyRemotePartsOnStart ?? true,
      cleanupCheckpointWhenCompleted: options.cleanupCheckpointWhenCompleted ?? true,
      enableChunkHash: options.enableChunkHash ?? true,
      checkpointStore: createCheckpointStore(options.checkpointStore),
      hashStrategy: options.hashStrategy ?? new SampledFileHashStrategy(),
      chunkHashStrategy: options.chunkHashStrategy ?? new Sha256ChunkHashStrategy(),
      retry: mergeRetryPolicy(options.retry),
      progressWeights: {
        hash: totalWeight === 0 ? 0.1 : progressWeights.hash / totalWeight,
        upload: totalWeight === 0 ? 0.9 : progressWeights.upload / totalWeight,
      },
    };

    this.snapshot = {
      status: 'idle',
      partSize: this.options.partSize,
      totalParts: 0,
      uploadedPartNumbers: [],
      pendingPartNumbers: [],
      completedParts: [],
      progress: { ...DEFAULT_PROGRESS_STATE },
      flags: {
        resumedFromCheckpoint: false,
        resumedFromRemote: false,
        instantUpload: false,
      },
    };
  }

  on<TKey extends keyof UploadEventMap<TResult, TServerContext>>(
    eventName: TKey,
    listener: (payload: UploadEventMap<TResult, TServerContext>[TKey]) => void,
  ) {
    return this.emitter.on(eventName, listener);
  }

  getSnapshot() {
    return this.cloneSnapshot();
  }

  async prepare(file: File) {
    this.ensureNotDestroyed();

    if (this.snapshot.status === 'uploading') {
      throw new Error('Upload is in progress. Pause or cancel it before preparing a new file.');
    }

    this.resetForNewFile(file);
    this.setStatus('hashing');
    this.prepareController?.abort();
    const prepareController = new AbortController();
    this.prepareController = prepareController;

    try {
      this.checkpoint = await this.options.checkpointStore.load(this.fileIdentity!);

      if (this.checkpoint?.fileHash && this.checkpoint.hashStrategyId === this.options.hashStrategy.id) {
        this.snapshot.flags.resumedFromCheckpoint = true;
        this.snapshot.fileHash = this.checkpoint.fileHash;
        this.hashProgress = 1;
      } else {
        this.hashProgress = 0;
        this.snapshot.fileHash = await this.options.hashStrategy.calculate(file, {
          onProgress: (progress) => {
            this.hashProgress = progress;
            this.refreshSnapshot('progress');
          },
          signal: prepareController.signal,
        });
        this.hashProgress = 1;
      }

      this.restoreCheckpointProgress();
      await this.persistCheckpoint();
      this.setStatus('ready');
      return this.cloneSnapshot();
    } finally {
      if (this.prepareController === prepareController) {
        this.prepareController = null;
      }
    }
  }

  async start(file?: File) {
    if (file) {
      await this.prepare(file);
    } else if (!this.file) {
      throw new Error('No file selected. Call prepare(file) or start(file) first.');
    }

    return this.launchUpload(false);
  }

  async resume() {
    if (!this.file) {
      throw new Error('No file selected. Call prepare(file) first.');
    }

    return this.launchUpload(true);
  }

  async pause() {
    this.ensureNotDestroyed();

    if (this.snapshot.status !== 'uploading') {
      return this.cloneSnapshot();
    }

    this.pauseRequested = true;
    this.abortActiveControllers();
    await this.runPromise;
    return this.cloneSnapshot();
  }

  async cancel(options?: { removeCheckpoint?: boolean }) {
    this.ensureNotDestroyed();

    this.cancelRequested = true;
    this.pauseRequested = false;
    this.abortActiveControllers();

    if (this.runPromise) {
      await this.runPromise;
    }

    if (this.snapshot.uploadId && this.file && this.options.adapter.abortUpload) {
      await this.options.adapter.abortUpload({
        uploadId: this.snapshot.uploadId,
        file: this.file,
        fileHash: this.snapshot.fileHash,
        serverContext: this.snapshot.serverContext,
      });
    }

    this.setStatus('canceled');
    this.progressTracker.speedBps = 0;

    if (options?.removeCheckpoint ?? true) {
      await this.clearCheckpoint();
    } else {
      await this.persistCheckpoint();
    }

    this.emitter.emit('cancel', this.cloneSnapshot());
    return this.cloneSnapshot();
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.prepareController?.abort();
    this.prepareController = null;
    this.abortActiveControllers();
    this.emitter.clear();
  }

  private async launchUpload(isResume: boolean) {
    this.ensureNotDestroyed();

    if (this.runPromise && this.snapshot.status === 'uploading') {
      return this.runPromise;
    }

    if (!this.file || !this.fileIdentity || !this.snapshot.fileHash) {
      throw new Error('Uploader is not prepared. Call prepare(file) first.');
    }

    this.pauseRequested = false;
    this.cancelRequested = false;

    const runToken = ++this.currentRunToken;
    const runTask = this.runUpload(runToken, isResume);

    this.runPromise = runTask.finally(() => {
      if (this.runPromise === runTask) {
        this.runPromise = null;
      }
    });

    return this.runPromise;
  }

  private async runUpload(runToken: number, isResume: boolean) {
    try {
      const session = await this.options.adapter.createUploadSession({
        file: this.file!,
        fileIdentity: this.fileIdentity!,
        fileHash: this.snapshot.fileHash!,
        partSize: this.snapshot.partSize,
        totalParts: this.chunks.length,
        existingUploadId: this.snapshot.uploadId,
        checkpoint: this.checkpoint,
      });

      if (session.partSize && session.partSize !== this.snapshot.partSize) {
        this.snapshot.partSize = session.partSize;
        this.chunks = createChunks(this.file!, session.partSize);
      }

      this.snapshot.uploadId = session.uploadId;
      this.snapshot.serverContext = session.serverContext;
      this.snapshot.flags.instantUpload = Boolean(session.completed);

      if (session.uploadedParts) {
        this.syncUploadedParts(session.uploadedParts);
      } else if (this.options.verifyRemotePartsOnStart && this.options.adapter.listUploadedParts) {
        const remoteParts = await this.options.adapter.listUploadedParts({
          uploadId: session.uploadId,
          file: this.file!,
          fileHash: this.snapshot.fileHash!,
          serverContext: this.snapshot.serverContext,
        });
        this.syncUploadedParts(remoteParts);
      }

      this.snapshot.flags.resumedFromRemote = this.uploadedParts.size > 0;
      await this.persistCheckpoint();

      if (session.completed) {
        this.snapshot.result = session.result;
        this.completeSnapshot();
        return session.result;
      }

      this.setStatus('uploading');

      if (isResume) {
        this.emitter.emit('resume', this.cloneSnapshot());
      }

      await this.uploadPendingChunks(runToken);

      if (this.cancelRequested) {
        this.setStatus('canceled');
        return undefined;
      }

      if (this.pauseRequested) {
        this.progressTracker.speedBps = 0;
        this.setStatus('paused');
        this.emitter.emit('pause', this.cloneSnapshot());
        return undefined;
      }

      if (!this.isAllChunksUploaded()) {
        throw new Error('Upload finished unexpectedly before all chunks were confirmed.');
      }

      if (this.options.autoComplete && this.options.adapter.completeUpload) {
        const result = await this.options.adapter.completeUpload({
          uploadId: this.snapshot.uploadId!,
          file: this.file!,
          fileHash: this.snapshot.fileHash!,
          partSize: this.snapshot.partSize,
          totalParts: this.chunks.length,
          completedParts: normalizeCompletedParts(Array.from(this.uploadedParts.values())),
          serverContext: this.snapshot.serverContext,
        });
        this.snapshot.result = result.result;
        this.snapshot.serverContext = result.serverContext ?? this.snapshot.serverContext;
      }

      this.completeSnapshot();
      return this.snapshot.result;
    } catch (error) {
      if (this.cancelRequested) {
        this.setStatus('canceled');
        return undefined;
      }

      if (this.pauseRequested && isAbortError(error)) {
        this.progressTracker.speedBps = 0;
        this.setStatus('paused');
        this.emitter.emit('pause', this.cloneSnapshot());
        return undefined;
      }

      const errorInfo = toErrorInfo(error);
      this.snapshot.error = errorInfo;
      this.progressTracker.speedBps = 0;
      this.setStatus('error');
      await this.persistCheckpoint();
      this.emitter.emit('error', {
        error: errorInfo,
        snapshot: this.cloneSnapshot(),
      });
      throw error;
    }
  }

  private async uploadPendingChunks(runToken: number) {
    const pendingChunks = this.getPendingChunks();
    const queue = [...pendingChunks];
    let fatalError: Error | null = null;

    const workers = Array.from({ length: Math.min(this.options.concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        if (fatalError || this.pauseRequested || this.cancelRequested || runToken !== this.currentRunToken) {
          return;
        }

        const chunk = queue.shift();
        if (!chunk || this.uploadedParts.has(chunk.partNumber)) {
          continue;
        }

        try {
          await this.uploadChunkWithRetry(chunk);
        } catch (error) {
          if (this.pauseRequested || this.cancelRequested || isAbortError(error)) {
            return;
          }

          fatalError = error instanceof Error ? error : new Error(String(error));
          this.abortActiveControllers();
          return;
        }
      }
    });

    await Promise.all(workers);

    if (fatalError) {
      throw fatalError;
    }
  }

  private async uploadChunkWithRetry(chunk: UploadChunkDescriptor) {
    for (let attempt = 1; attempt <= this.options.retry.maxAttempts; attempt += 1) {
      try {
        await this.uploadSingleChunk(chunk);
        return;
      } catch (error) {
        if (this.pauseRequested || this.cancelRequested || isAbortError(error)) {
          throw error;
        }

        if (attempt >= this.options.retry.maxAttempts) {
          throw error;
        }

        const delayMs = computeRetryDelay(this.options.retry, attempt);
        this.emitter.emit('chunkRetry', {
          chunk,
          attempt,
          delayMs,
          error: toErrorInfo(error),
          snapshot: this.cloneSnapshot(),
        });
        await delay(delayMs);
      }
    }
  }

  private async uploadSingleChunk(chunk: UploadChunkDescriptor) {
    if (!this.file || !this.snapshot.fileHash || !this.snapshot.uploadId) {
      throw new Error('Uploader context is incomplete.');
    }

    const blob = this.file.slice(chunk.start, chunk.end);
    const controller = new AbortController();

    this.activeControllers.set(chunk.partNumber, controller);
    this.activePartLoadedBytes.set(chunk.partNumber, 0);
    this.emitter.emit('chunkStart', {
      chunk,
      snapshot: this.cloneSnapshot(),
    });
    this.refreshSnapshot('progress');

    try {
      const partHash =
        this.options.enableChunkHash && chunk.size > 0
          ? await this.options.chunkHashStrategy.calculate(blob, chunk, {
              signal: controller.signal,
            })
          : undefined;

      const result = await this.options.adapter.uploadPart({
        uploadId: this.snapshot.uploadId,
        file: this.file,
        fileHash: this.snapshot.fileHash,
        chunk,
        blob,
        partHash,
        serverContext: this.snapshot.serverContext,
        signal: controller.signal,
        onProgress: (progress) => {
          this.handlePartProgress(chunk, progress);
        },
      });

      this.snapshot.serverContext = result.serverContext ?? this.snapshot.serverContext;

      if (result.uploadedParts) {
        this.syncUploadedParts(result.uploadedParts);
      } else {
        this.upsertUploadedPart(
          result.part ?? {
            partNumber: chunk.partNumber,
            size: chunk.size,
            partHash,
          },
        );
      }

      this.activePartLoadedBytes.delete(chunk.partNumber);
      await this.persistCheckpoint();
      this.refreshSnapshot('progress');
      this.emitter.emit('chunkSuccess', {
        chunk,
        snapshot: this.cloneSnapshot(),
      });
    } finally {
      this.activeControllers.delete(chunk.partNumber);
      this.activePartLoadedBytes.delete(chunk.partNumber);
      this.refreshSnapshot('progress');
    }
  }

  private handlePartProgress(chunk: UploadChunkDescriptor, progress: UploadPartProgress) {
    const loadedBytes = Math.max(0, Math.min(chunk.size, progress.loaded));
    this.activePartLoadedBytes.set(chunk.partNumber, loadedBytes);
    this.refreshSnapshot('progress');
    this.emitter.emit('chunkProgress', {
      chunk,
      progress,
      snapshot: this.cloneSnapshot(),
    });
  }

  private completeSnapshot() {
    this.hashProgress = 1;
    this.progressTracker.speedBps = 0;
    this.snapshot.completedAt = new Date().toISOString();
    this.setStatus('completed');

    if (this.options.cleanupCheckpointWhenCompleted) {
      void this.clearCheckpoint();
    } else {
      void this.persistCheckpoint();
    }

    this.emitter.emit('success', this.cloneSnapshot());
  }

  private restoreCheckpointProgress() {
    if (!this.checkpoint) {
      return;
    }

    if (this.checkpoint.partSize !== this.snapshot.partSize) {
      return;
    }

    if (this.checkpoint.totalParts !== this.chunks.length) {
      return;
    }

    this.syncUploadedParts(this.checkpoint.completedParts);
    this.snapshot.uploadId = this.checkpoint.uploadId;
    this.snapshot.serverContext = this.checkpoint.serverContext;
  }

  private syncUploadedParts(parts: UploadPartRecord[]) {
    const nextParts = normalizeCompletedParts(parts).filter((part) => part.partNumber >= 1 && part.partNumber <= this.chunks.length);
    this.uploadedParts.clear();

    for (const part of nextParts) {
      this.uploadedParts.set(part.partNumber, part);
    }

    this.refreshSnapshot('progress');
  }

  private upsertUploadedPart(part: UploadPartRecord) {
    this.uploadedParts.set(part.partNumber, part);
    this.refreshSnapshot('progress');
  }

  private isAllChunksUploaded() {
    return this.uploadedParts.size === this.chunks.length;
  }

  private getPendingChunks() {
    return this.chunks.filter((chunk) => !this.uploadedParts.has(chunk.partNumber));
  }

  private resetForNewFile(file: File) {
    this.file = file;
    this.fileIdentity = createFileIdentity(file);
    this.hashProgress = 0;
    this.pauseRequested = false;
    this.cancelRequested = false;
    this.checkpoint = null;
    this.prepareController?.abort();
    this.prepareController = null;
    this.currentRunToken += 1;
    this.abortActiveControllers();
    this.uploadedParts.clear();
    this.activePartLoadedBytes.clear();
    this.chunks = createChunks(file, this.options.partSize);
    this.progressTracker = {
      previousUploadedBytes: 0,
      previousTimestamp: performance.now(),
      speedBps: 0,
    };
    this.snapshot = {
      ...this.snapshot,
      status: 'idle',
      file,
      fileIdentity: this.fileIdentity,
      fileHash: undefined,
      uploadId: undefined,
      partSize: this.options.partSize,
      totalParts: this.chunks.length,
      uploadedPartNumbers: [],
      pendingPartNumbers: this.chunks.map((chunk) => chunk.partNumber),
      completedParts: [],
      progress: {
        ...DEFAULT_PROGRESS_STATE,
        totalBytes: file.size,
        remainingBytes: file.size,
      },
      flags: {
        resumedFromCheckpoint: false,
        resumedFromRemote: false,
        instantUpload: false,
      },
      serverContext: undefined,
      result: undefined,
      error: undefined,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: undefined,
    };
    this.refreshSnapshot('snapshot');
  }

  private refreshSnapshot(eventType: 'snapshot' | 'progress' | 'statusChange') {
    const progress = this.calculateProgress();
    this.snapshot.progress = progress;
    this.snapshot.totalParts = this.chunks.length;
    this.snapshot.completedParts = normalizeCompletedParts(Array.from(this.uploadedParts.values()));
    this.snapshot.uploadedPartNumbers = this.snapshot.completedParts.map((part) => part.partNumber);
    this.snapshot.pendingPartNumbers = this.getPendingChunks().map((chunk) => chunk.partNumber);
    this.snapshot.updatedAt = new Date().toISOString();

    const snapshot = this.cloneSnapshot();
    this.emitter.emit('snapshot', snapshot);

    if (eventType !== 'snapshot') {
      this.emitter.emit(eventType, snapshot);
    }
  }

  private calculateProgress() {
    const totalBytes = this.file?.size ?? 0;
    const confirmedUploadedBytes = Array.from(this.uploadedParts.values()).reduce(
      (total, part) => total + (part.size ?? this.findChunkSize(part.partNumber)),
      0,
    );
    const inflightBytes = Array.from(this.activePartLoadedBytes.values()).reduce((total, loaded) => total + loaded, 0);
    const uploadedBytes = Math.min(totalBytes, confirmedUploadedBytes + inflightBytes);
    const uploadPercent = totalBytes === 0 ? 100 : clampPercent((uploadedBytes / totalBytes) * 100);
    const hashingPercent = clampPercent(this.hashProgress * 100);
    const overallPercent =
      this.snapshot.status === 'completed'
        ? 100
        : clampPercent(
            hashingPercent * this.options.progressWeights.hash + uploadPercent * this.options.progressWeights.upload,
          );
    const speedBps = this.calculateSpeed(uploadedBytes);
    const remainingBytes = Math.max(0, totalBytes - uploadedBytes);

    return {
      hashingPercent,
      uploadPercent,
      overallPercent,
      uploadedBytes,
      confirmedUploadedBytes,
      totalBytes,
      speedBps,
      remainingBytes,
      estimatedRemainingMs: speedBps > 0 ? Math.round((remainingBytes / speedBps) * 1000) : null,
    };
  }

  private calculateSpeed(uploadedBytes: number) {
    if (this.snapshot.status !== 'uploading') {
      return 0;
    }

    const now = performance.now();
    const deltaBytes = uploadedBytes - this.progressTracker.previousUploadedBytes;
    const deltaTime = now - this.progressTracker.previousTimestamp;

    if (deltaBytes > 0 && deltaTime > 0) {
      this.progressTracker.speedBps = (deltaBytes / deltaTime) * 1000;
      this.progressTracker.previousUploadedBytes = uploadedBytes;
      this.progressTracker.previousTimestamp = now;
    }

    return Math.max(0, Math.round(this.progressTracker.speedBps));
  }

  private findChunkSize(partNumber: number) {
    return this.chunks.find((chunk) => chunk.partNumber === partNumber)?.size ?? 0;
  }

  private setStatus(status: UploadStatus) {
    if (this.snapshot.status === status) {
      this.refreshSnapshot('snapshot');
      return;
    }

    this.snapshot.status = status;
    this.refreshSnapshot('statusChange');
  }

  private cloneSnapshot(): UploadSnapshot<TResult, TServerContext> {
    return {
      ...this.snapshot,
      flags: { ...this.snapshot.flags },
      progress: { ...this.snapshot.progress },
      completedParts: this.snapshot.completedParts.map((part) => ({ ...part })),
      uploadedPartNumbers: [...this.snapshot.uploadedPartNumbers],
      pendingPartNumbers: [...this.snapshot.pendingPartNumbers],
    };
  }

  private abortActiveControllers() {
    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();
  }

  private async persistCheckpoint() {
    if (!this.fileIdentity) {
      return;
    }

    this.checkpoint = {
      version: 1,
      fileIdentity: this.fileIdentity,
      hashStrategyId: this.options.hashStrategy.id,
      fileHash: this.snapshot.fileHash,
      uploadId: this.snapshot.uploadId,
      partSize: this.snapshot.partSize,
      totalParts: this.chunks.length,
      completedParts: normalizeCompletedParts(Array.from(this.uploadedParts.values())),
      serverContext: this.snapshot.serverContext,
      updatedAt: new Date().toISOString(),
    };

    await this.options.checkpointStore.save(this.checkpoint);
  }

  private async clearCheckpoint() {
    if (!this.fileIdentity) {
      return;
    }

    await this.options.checkpointStore.remove(this.fileIdentity.signature);
    this.checkpoint = null;
  }

  private ensureNotDestroyed() {
    if (this.destroyed) {
      throw new Error('Uploader has been destroyed.');
    }
  }
}
